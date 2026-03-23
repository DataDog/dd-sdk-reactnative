/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum, SdkVerbosity, InternalLog } from '@datadog/mobile-react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';
import { AppState, BackHandler } from 'react-native';

import { NavigationTimeline } from './NavigationTimeline';
import type { StateEvent } from './NavigationTimeline';
import type {
    NavigationContainerRef,
    Route,
    NavigationListener
} from './react-navigation';
import { transformViewKey } from './utils';

const REACT_NAVIGATION_TRACKING_MODULE =
    'com.datadog.reactnative.rum.react_navigation_tracking';

function getGlobalInstance<T>(key: string, objectConstructor: () => T): T {
    const symbol = Symbol.for(key);
    const g = (globalThis as unknown) as Record<PropertyKey, unknown>;

    if (!(symbol in g)) {
        g[symbol] = objectConstructor();
    }
    return g[symbol] as T;
}

// Minimal interface for the NavigationBuffer methods used by this package.
// Accessed via the shared globalThis key so we don't need to import
// BufferSingleton from the core package's public API.
interface INavigationBuffer {
    readonly navigationStartTime: number | null;
    startNavigation(): void;
    prepareEndNavigation(): void;
    flush(): void;
    endNavigation(): void;
}

interface IBufferSingleton {
    getNavigationBuffer(): INavigationBuffer | null;
}

// IMPORTANT: Keep this key aligned with core package
const BUFFER_SINGLETON_KEY = 'com.datadog.reactnative.buffer_singleton';

// AppStateStatus can have values:
//     'active' - The app is running in the foreground
//     'background' - The app is running in the background. The user is either in another app or on the home screen
//     'inactive' [iOS] - This is a transition state that currently never happens for typical React Native apps.
//     'unknown' [iOS] - Initial value until the current app state is determined
//     'extension' [iOS] - The app is running as an app extension
declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null;

export type NavigationTrackingOptions = {
    viewNamePredicate?: ViewNamePredicate;
    viewTrackingPredicate?: ViewTrackingPredicate;
    paramsTrackingPredicate?: ParamsTrackingPredicate;
    /**
     * When `true` (default), a NavigationBuffer is used to hold RUM events (e.g. resources,
     * actions) that fire between a navigation dispatch and the next `onStateChange` callback.
     * Those buffered events are then flushed and attributed to the newly-started view, preventing
     * them from being attributed to the previous view.
     *
     * Set to `false` to disable the buffer entirely. Events will pass through immediately without
     * any buffering. Use this if the buffer causes unexpected behaviour in your setup.
     *
     * @default true
     */
    useNavigationBuffer?: boolean;
};

export type ViewNamePredicate = (
    route: Route<string, any | undefined>,
    trackedName: string
) => string | null;

export type ViewTrackingPredicate = (
    route: Route<string, any | undefined>
) => boolean;

export type ParamsTrackingPredicate = (
    route: Route<string, any | undefined>
) => object | undefined;

function defaultViewNamePredicate(
    _route: Route<string, any | undefined>,
    trackedName: string
) {
    return trackedName;
}

function defaultParamsPredicate(_route: Route<string, any | undefined>) {
    return undefined;
}

function defaultViewTrackingPredicate(_route: Route<string, any | undefined>) {
    return true;
}

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
class RumReactNavigationTracking {
    readonly ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE =
        'A navigation change was detected but the RUM ViewEvent was dropped as the route was undefined.';
    readonly NULL_NAVIGATION_REF_ERROR_MESSAGE =
        'Cannot track views with a null navigationRef.';
    readonly NAVIGATION_REF_IN_USE_ERROR_MESSAGE =
        'Cannot track new navigation container while another one is still tracked. Please call `DdRumReactNavigationTracking.stopTrackingViews` on the previous container reference.';

    private _navigationTimeline?: NavigationTimeline;
    private get navigationTimeline(): NavigationTimeline | undefined {
        if (!this.__INTERNAL._enableNavigationTimeline) {
            return undefined;
        }
        if (!this._navigationTimeline) {
            this._navigationTimeline = new NavigationTimeline();
        }
        return this._navigationTimeline;
    }

    private registeredContainer: NavigationContainerRef | null = null;

    private navigationStateChangeListener: NavigationListener | null = null;

    private previousRoute: string | object | undefined = undefined;

    private viewNamePredicate: ViewNamePredicate = defaultViewNamePredicate;
    private viewTrackingPredicate: ViewTrackingPredicate = defaultViewTrackingPredicate;
    private paramsTrackingPredicate: ParamsTrackingPredicate = defaultParamsPredicate;

    private backHandler: NativeEventSubscription | null = null;

    private unsafeActionListener: NavigationListener | null = null;

    private appStateSubscription?: NativeEventSubscription;

    private previousAppState: AppStateStatus | undefined;

    private previousRouteKey: string | undefined;

    private trackingState: 'TRACKING' | 'NOT_TRACKING' = 'NOT_TRACKING';

    private useNavigationBuffer: boolean = true;

    /**
     * @internal
     * DO NOT USE: This API is for internal testing only.
     */
    __INTERNAL = {
        /**
         * @internal
         * DO NOT USE: This API is for internal testing only.
         */
        _enableNavigationTimeline: false,
        /**
         * @internal
         * DO NOT USE: This API is for internal testing only.
         */
        _getNavigationTimeline: () => {
            return [...(this.navigationTimeline?.events ?? [])];
        }
    };

    isAppExitingOnBackPress = (): boolean => {
        if (this.registeredContainer === null) {
            return false;
        }
        if (this.registeredContainer.canGoBack()) {
            return false;
        }
        return true;
    };

    onBackPress = () => {
        if (this.isAppExitingOnBackPress()) {
            this.stopTrackingViews(this.registeredContainer);
        }
        // We always return false so we make sure the react-navigation callback is called.
        // See https://reactnative.dev/docs/backhandler
        return false;
    };

    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     * @param trackingOptions the options object defining how views will be tracked. It contains:
     *      viewNamePredicate: the predicate to rename views.
     *      viewTrackingPredicate: the predicate to determine if a view should be tracked or not.
     *      paramsTrackingPredicate: the predicate to determine which parameters should be tracked for a given view.
     */
    startTrackingViews(
        navigationRef: NavigationContainerRef | null,
        trackingOptions?: NavigationTrackingOptions
    ): void {
        this.navigationTimeline?.addStartTrackingEvent();

        const {
            viewNamePredicate = defaultViewNamePredicate,
            viewTrackingPredicate = defaultViewTrackingPredicate,
            paramsTrackingPredicate = defaultParamsPredicate,
            useNavigationBuffer = true
        } = trackingOptions ?? {};
        this.useNavigationBuffer = useNavigationBuffer;

        if (navigationRef == null) {
            InternalLog.log(
                this.NULL_NAVIGATION_REF_ERROR_MESSAGE,
                SdkVerbosity.ERROR
            );
            return;
        }

        if (
            this.registeredContainer != null &&
            this.registeredContainer !== navigationRef
        ) {
            InternalLog.log(
                this.NAVIGATION_REF_IN_USE_ERROR_MESSAGE,
                SdkVerbosity.ERROR
            );
        } else if (this.registeredContainer == null) {
            if (viewNamePredicate) {
                this.viewNamePredicate = viewNamePredicate;
            }

            if (viewTrackingPredicate) {
                this.viewTrackingPredicate = viewTrackingPredicate;
            }

            if (paramsTrackingPredicate) {
                this.paramsTrackingPredicate = paramsTrackingPredicate;
            }
            this.registeredContainer = navigationRef;

            // Listen to __unsafe_action__ — fires before state changes and before
            // the new screen mounts, so the buffer is active before any useEffect fetches run.
            // This catches all navigation (in-screen navigate() calls AND external dispatch()),
            // unlike patching navigationRef.dispatch which only catches the latter.
            // Only wired when useNavigationBuffer is true.
            if (this.useNavigationBuffer) {
                this.unsafeActionListener = (event: any) => {
                    if (event.data?.noop) {
                        return;
                    }
                    this.getNavBuffer()?.startNavigation();
                };
                navigationRef.addListener(
                    '__unsafe_action__',
                    this.unsafeActionListener
                );
            }

            const listener = this.resolveNavigationStateChangeListener();
            navigationRef.addListener('state', listener);

            this.backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                this.onBackPress
            );
            this.appStateSubscription = AppState.addEventListener(
                'change',
                this.appStateListener
            );
        }
    }

    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    stopTrackingViews(navigationRef: NavigationContainerRef | null): void {
        this.navigationTimeline?.addStopTrackingEvent();
        this.previousRoute = undefined;
        if (navigationRef != null) {
            if (this.unsafeActionListener) {
                navigationRef.removeListener(
                    '__unsafe_action__',
                    this.unsafeActionListener
                );
                this.unsafeActionListener = null;
            }
            this.getNavBuffer()?.endNavigation();

            if (this.navigationStateChangeListener) {
                navigationRef.removeListener(
                    'state',
                    this.navigationStateChangeListener
                );
            }
            this.backHandler?.remove();
            this.backHandler = null;
            this.registeredContainer = null;
            this.navigationStateChangeListener = null;

            this.resetPredicates();
        }

        // For versions of React Native below 0.65, addEventListener does not return a subscription.
        // We have to call AppState.removeEventListener instead.
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();

            // The next if check is important as users can call `stopTrackingViews` before `startTrackingViews`
            // see https://github.com/DataDog/dd-sdk-reactnative/issues/422
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
        } else if (AppState.removeEventListener) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            AppState.removeEventListener('change', this.appStateListener);
        }
    }

    _resetInternalStateForTesting(): void {
        if (this.unsafeActionListener && this.registeredContainer) {
            this.registeredContainer.removeListener(
                '__unsafe_action__',
                this.unsafeActionListener
            );
        }
        this._navigationTimeline = undefined;
        this.registeredContainer = null;
        this.navigationStateChangeListener = null;
        this.unsafeActionListener = null;
        this.previousRoute = undefined;
        this.backHandler = null;
        this.appStateSubscription = undefined;
        this.previousAppState = undefined;
        this.previousRouteKey = undefined;
        this.trackingState = 'NOT_TRACKING';
        this.useNavigationBuffer = true;
        this.resetPredicates();
        this.getNavBuffer()?.endNavigation();
    }

    private resetPredicates() {
        this.paramsTrackingPredicate = defaultParamsPredicate;
        this.viewNamePredicate = defaultViewNamePredicate;
        this.viewTrackingPredicate = defaultViewTrackingPredicate;
    }

    private getNavBuffer(): INavigationBuffer | null | undefined {
        if (!this.useNavigationBuffer) {
            return undefined;
        }
        const symbol = Symbol.for(BUFFER_SINGLETON_KEY);
        const singleton = (globalThis as any)[symbol] as
            | IBufferSingleton
            | undefined;
        return singleton?.getNavigationBuffer() ?? null;
    }

    private handleRouteNavigation(
        route: Route<string, any | undefined> | undefined,
        appStateStatus: AppStateStatus,
        stateEvent: StateEvent | undefined
    ) {
        if (route === undefined || route === null) {
            InternalLog.log(
                this.ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE,
                SdkVerbosity.WARN
            );
            // RUMM-1400 in some cases the route seem to be undefined
            // Still drain the buffer so events are never held indefinitely
            this.getNavBuffer()?.endNavigation();
            return;
        }
        const key = route.key;
        const screenName = this.viewNamePredicate(route, route.name);
        const customKey = transformViewKey(key, screenName);

        if (key != null && screenName != null) {
            // On iOS, the app can start in either "active", "background" or "unknown" state
            if (appStateStatus !== 'background') {
                this.previousRoute = route;
                this.trackingState = 'TRACKING';
                this.navigationTimeline?.addNavigationStateEvent(
                    'START_VIEW',
                    key,
                    stateEvent,
                    {
                        activeView: undefined,
                        trackingState: this.trackingState
                    }
                );
                if (this.viewTrackingPredicate(route)) {
                    // Stop buffering BEFORE startView so the startView call
                    // itself passes through the NavigationBuffer immediately (not queued).
                    // Then flush queued events AFTER startView resolves so they are
                    // attributed to the now-active view.
                    const navBuffer = this.getNavBuffer();
                    // Capture the navigation start timestamp BEFORE prepareEndNavigation
                    // clears it, so we can backdate the view start to when navigation began.
                    const navigationStartTime =
                        navBuffer?.navigationStartTime ?? undefined;
                    navBuffer?.prepareEndNavigation();

                    const params = this.paramsTrackingPredicate(route);
                    const context = params ? { params } : undefined;
                    const startViewPromise =
                        navigationStartTime !== undefined
                            ? DdRum.startView(
                                  customKey,
                                  screenName,
                                  context ?? {},
                                  navigationStartTime
                              )
                            : context
                            ? DdRum.startView(customKey, screenName, context)
                            : DdRum.startView(customKey, screenName);

                    startViewPromise
                        .then(() => {
                            navBuffer?.flush();
                        })
                        .catch(() => {
                            // Fail-safe: always release buffered events
                            navBuffer?.flush();
                        });
                } else {
                    // view not tracked — drain buffer immediately (no startView to wait for)
                    this.getNavBuffer()?.endNavigation();
                }
            } else {
                // App is in background — no startView, drain buffer immediately
                this.getNavBuffer()?.endNavigation();
            }
        } else {
            // key or screenName is null — no startView, drain buffer immediately
            this.getNavBuffer()?.endNavigation();
        }

        this.previousRouteKey = route.key;
    }

    private handleAppStateChanged(
        route: Route<string, any | undefined>,
        appStateStatus: AppStateStatus
    ) {
        const appStateChangeEvent = this.navigationTimeline?.addAppStateChangeEvent(
            this.previousAppState,
            appStateStatus
        );
        const key = route.key;
        const screenName = this.viewNamePredicate(route, route.name);
        const customKey = transformViewKey(key, screenName);

        if (key != null && screenName != null) {
            if (appStateStatus === 'background') {
                this.trackingState = 'NOT_TRACKING';
                this.navigationTimeline?.addNavigationStateEvent(
                    'STOP_VIEW',
                    key,
                    appStateChangeEvent,
                    {
                        activeView: undefined,
                        trackingState: this.trackingState
                    }
                );
                DdRum.stopView(customKey);
                this.previousRoute = undefined;
            } else if (
                appStateStatus === 'active' &&
                this.trackingState === 'NOT_TRACKING'
            ) {
                // case when app goes into foreground,
                // in that case navigation listener won't be called
                this.handleRouteNavigation(
                    route,
                    AppState.currentState,
                    appStateChangeEvent
                );
            }
        }

        this.previousRouteKey = key;
        this.previousAppState = appStateStatus;
    }

    private resolveNavigationStateChangeListener(): NavigationListener {
        if (this.navigationStateChangeListener == null) {
            this.navigationStateChangeListener = () => {
                const route = this.registeredContainer?.getCurrentRoute();
                const newRouteStateEvent = this.navigationTimeline?.addNewRouteEvent(
                    this.previousRouteKey,
                    route?.key
                );

                if (route === undefined) {
                    InternalLog.log(
                        this.ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE,
                        SdkVerbosity.WARN
                    );
                    return;
                }

                // Route already tracked
                if (this.previousRoute === route) {
                    this.navigationTimeline?.addNavigationStateEvent(
                        'DISCARDED',
                        route.name,
                        newRouteStateEvent,
                        {
                            activeView: route.name,
                            trackingState: this.trackingState
                        }
                    );
                    return;
                }

                this.handleRouteNavigation(
                    route,
                    AppState.currentState,
                    newRouteStateEvent
                );
            };

            this.navigationStateChangeListener({});
        }
        return this.navigationStateChangeListener;
    }

    private appStateListener: AppStateListener = (
        appStateStatus: AppStateStatus
    ) => {
        const currentRoute = this.registeredContainer?.getCurrentRoute();
        if (currentRoute === undefined || currentRoute === null) {
            InternalLog.log(
                `We could not determine the route when changing the application state to: ${appStateStatus}. No RUM View event will be sent in this case.`,
                SdkVerbosity.ERROR
            );
            return;
        }

        this.handleAppStateChanged(currentRoute, appStateStatus);
    };
}

export const DdRumReactNavigationTracking = getGlobalInstance(
    REACT_NAVIGATION_TRACKING_MODULE,
    () => new RumReactNavigationTracking()
);
