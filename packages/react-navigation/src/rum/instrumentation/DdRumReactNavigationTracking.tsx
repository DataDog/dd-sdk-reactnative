/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum, SdkVerbosity, InternalLog } from '@datadog/mobile-react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';
import { AppState, BackHandler } from 'react-native';

import type {
    NavigationContainerRef,
    Route,
    NavigationListener
} from './react-navigation';

// AppStateStatus can have values:
//     'active' - The app is running in the foreground
//     'background' - The app is running in the background. The user is either in another app or on the home screen
//     'inactive' [iOS] - This is a transition state that currently never happens for typical React Native apps.
//     'unknown' [iOS] - Initial value until the current app state is determined
//     'extension' [iOS] - The app is running as an app extension
declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null;

export type ViewNamePredicate = (
    route: Route<string, any | undefined>,
    trackedName: string
) => string | { name: string; context?: object } | null;

const isPredicateResultString = (
    predicateResult: string | { name: string; context?: object } | null
): predicateResult is string => {
    return typeof predicateResult === 'string';
};
/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export class DdRumReactNavigationTracking {
    private static registeredContainer: NavigationContainerRef | null;

    private static navigationStateChangeListener: NavigationListener;

    private static viewNamePredicate: ViewNamePredicate;

    private static backHandler: NativeEventSubscription | null;

    private static appStateSubscription?: NativeEventSubscription;

    static ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE =
        'A navigation change was detected but the RUM ViewEvent was dropped as the route was undefined.';
    static NULL_NAVIGATION_REF_ERROR_MESSAGE =
        'Cannot track views with a null navigationRef.';
    static NAVIGATION_REF_IN_USE_ERROR_MESSAGE =
        'Cannot track new navigation container while another one is still tracked. Please call `DdRumReactNavigationTracking.stopTrackingViews` on the previous container reference.';

    static isAppExitingOnBackPress = (): boolean => {
        if (DdRumReactNavigationTracking.registeredContainer === null) {
            return false;
        }
        if (DdRumReactNavigationTracking.registeredContainer.canGoBack()) {
            return false;
        }
        return true;
    };

    static onBackPress = () => {
        if (DdRumReactNavigationTracking.isAppExitingOnBackPress()) {
            DdRumReactNavigationTracking.stopTrackingViews(
                DdRumReactNavigationTracking.registeredContainer
            );
        }
        // We always return false so we make sure the react-navigation callback is called.
        // See https://reactnative.dev/docs/backhandler
        return false;
    };

    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static startTrackingViews(
        navigationRef: NavigationContainerRef | null,
        viewNamePredicate: ViewNamePredicate = function (
            _route: Route<string, any | undefined>,
            trackedName: string
        ) {
            return trackedName;
        }
    ): void {
        if (navigationRef == null) {
            InternalLog.log(
                DdRumReactNavigationTracking.NULL_NAVIGATION_REF_ERROR_MESSAGE,
                SdkVerbosity.ERROR
            );
            return;
        }

        if (
            DdRumReactNavigationTracking.registeredContainer != null &&
            this.registeredContainer !== navigationRef
        ) {
            InternalLog.log(
                DdRumReactNavigationTracking.NAVIGATION_REF_IN_USE_ERROR_MESSAGE,
                SdkVerbosity.ERROR
            );
        } else if (DdRumReactNavigationTracking.registeredContainer == null) {
            DdRumReactNavigationTracking.viewNamePredicate = viewNamePredicate;
            const listener = DdRumReactNavigationTracking.resolveNavigationStateChangeListener();
            DdRumReactNavigationTracking.handleRouteNavigation(
                navigationRef.getCurrentRoute()
            );
            navigationRef.addListener('state', listener);
            DdRumReactNavigationTracking.registeredContainer = navigationRef;
            DdRumReactNavigationTracking.backHandler = BackHandler.addEventListener(
                'hardwareBackPress',
                DdRumReactNavigationTracking.onBackPress
            );
            this.appStateSubscription = AppState.addEventListener(
                'change',
                DdRumReactNavigationTracking.appStateListener
            );
        }
    }

    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static stopTrackingViews(
        navigationRef: NavigationContainerRef | null
    ): void {
        if (navigationRef != null) {
            navigationRef.removeListener(
                'state',
                DdRumReactNavigationTracking.navigationStateChangeListener
            );
            DdRumReactNavigationTracking.backHandler?.remove();
            DdRumReactNavigationTracking.backHandler = null;
            DdRumReactNavigationTracking.registeredContainer = null;
            DdRumReactNavigationTracking.viewNamePredicate = function (
                _route: Route<string, any | undefined>,
                trackedName: string
            ) {
                return trackedName;
            };
        }

        // For versions of React Native below 0.65, addEventListener does not return a subscription.
        // We have to call AppState.removeEventListener instead.
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        } else {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            AppState.removeEventListener(
                'change',
                DdRumReactNavigationTracking.appStateListener
            );
        }
    }

    private static handleRouteNavigation(
        route: Route<string, any | undefined> | undefined,
        appStateStatus: AppStateStatus | undefined = undefined
    ) {
        if (route === undefined || route === null) {
            InternalLog.log(
                DdRumReactNavigationTracking.ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE,
                SdkVerbosity.WARN
            );
            // RUMM-1400 in some cases the route seem to be undefined
            return;
        }
        const key = route.key;

        const predicate = DdRumReactNavigationTracking.viewNamePredicate;
        const screenName = predicate(route, route.name);

        if (key != null && screenName != null) {
            if (appStateStatus === 'background') {
                DdRum.stopView(key);
            } else if (
                appStateStatus === 'active' ||
                appStateStatus === undefined
            ) {
                // case when app goes into foreground,
                // in that case navigation listener won't be called
                if (isPredicateResultString(screenName)) {
                    DdRum.startView(key, screenName);
                } else {
                    DdRum.startView(key, screenName.name, screenName.context);
                }
            }
        }
    }

    private static resolveNavigationStateChangeListener(): NavigationListener {
        if (
            DdRumReactNavigationTracking.navigationStateChangeListener == null
        ) {
            DdRumReactNavigationTracking.navigationStateChangeListener = () => {
                const route = DdRumReactNavigationTracking.registeredContainer?.getCurrentRoute();

                if (route === undefined) {
                    InternalLog.log(
                        DdRumReactNavigationTracking.ROUTE_UNDEFINED_NAVIGATION_WARNING_MESSAGE,
                        SdkVerbosity.WARN
                    );
                    return;
                }

                DdRumReactNavigationTracking.handleRouteNavigation(route);
            };
        }
        return DdRumReactNavigationTracking.navigationStateChangeListener;
    }

    private static appStateListener: AppStateListener = (
        appStateStatus: AppStateStatus
    ) => {
        const currentRoute = DdRumReactNavigationTracking.registeredContainer?.getCurrentRoute();
        if (currentRoute === undefined || currentRoute === null) {
            InternalLog.log(
                `We could not determine the route when changing the application state to: ${appStateStatus}. No RUM View event will be sent in this case.`,
                SdkVerbosity.ERROR
            );
            return;
        }

        DdRumReactNavigationTracking.handleRouteNavigation(
            currentRoute,
            appStateStatus
        );
    };
}
