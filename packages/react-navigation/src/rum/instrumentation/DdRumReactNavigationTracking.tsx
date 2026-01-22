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

    private appStateSubscription?: NativeEventSubscription;

    private previousAppState: AppStateStatus | undefined;

    private previousRouteKey: string | undefined;

    private trackingState: 'TRACKING' | 'NOT_TRACKING' = 'NOT_TRACKING';

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
            paramsTrackingPredicate = defaultParamsPredicate
        } = trackingOptions ?? {};

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
        this._navigationTimeline = undefined;
        this.registeredContainer = null;
        this.navigationStateChangeListener = null;
        this.previousRoute = undefined;
        this.backHandler = null;
        this.appStateSubscription = undefined;
        this.previousAppState = undefined;
        this.previousRouteKey = undefined;
        this.trackingState = 'NOT_TRACKING';
        this.resetPredicates();
    }

    private resetPredicates() {
        this.paramsTrackingPredicate = defaultParamsPredicate;
        this.viewNamePredicate = defaultViewNamePredicate;
        this.viewTrackingPredicate = defaultViewTrackingPredicate;
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
                    const params = this.paramsTrackingPredicate(route);
                    if (params) {
                        DdRum.startView(customKey, screenName, { params });
                    } else {
                        DdRum.startView(customKey, screenName);
                    }
                }
            }
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
