/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import { DdRum } from '@datadog/mobile-react-native';
import { AppState, AppStateStatus } from 'react-native';

declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null

// AppStateStatus can have values: 
//     'active' - The app is running in the foreground
//     'background' - The app is running in the background. The user is either in another app or on the home screen
//     'inactive' [iOS] - This is a transition state that currently never happens for typical React Native apps.
//     'unknown' [iOS] - Initial value until the current app state is determined
//     'extension' [iOS] - The app is running as an app extension
declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null

export type ViewNamePredicate = (route: Route<string, any | undefined>, trackedName: string) => string

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export class DdRumReactNavigationTracking {

    private static registeredContainer: NavigationContainerRef | null;
    
    private static navigationStateChangeListener: NavigationListener;

    private static appStateListener: AppStateListener;

    private static viewNamePredicate: ViewNamePredicate;

    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static startTrackingViews(
            navigationRef: NavigationContainerRef | null,
            viewNamePredicate: ViewNamePredicate = function (_route: Route<string, any | undefined>, trackedName: string) { return trackedName; }
        ): void {

        if (navigationRef == null) {
            console.log ("Cannot track views with a null navigationRef");
            return;
        }

        if (DdRumReactNavigationTracking.registeredContainer != null && this.registeredContainer !== navigationRef) {
            console.error('Cannot track new navigation container while another one is still tracked');
        } else if (DdRumReactNavigationTracking.registeredContainer == null) {
            DdRumReactNavigationTracking.viewNamePredicate = viewNamePredicate;
            const listener = DdRumReactNavigationTracking.resolveNavigationStateChangeListener();
            DdRumReactNavigationTracking.handleRouteNavigation(navigationRef.getCurrentRoute());
            navigationRef.addListener("state", listener);
            DdRumReactNavigationTracking.registeredContainer = navigationRef;
        }


        DdRumReactNavigationTracking.registerAppStateListenerIfNeeded();
    }

    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static stopTrackingViews(navigationRef: NavigationContainerRef | null): void {
        if (navigationRef != null) {
            navigationRef.removeListener("state", DdRumReactNavigationTracking.navigationStateChangeListener);
            DdRumReactNavigationTracking.registeredContainer = null;
            DdRumReactNavigationTracking.viewNamePredicate = function (_route: Route<string, any | undefined>, trackedName: string) { return trackedName; }
        }
    }

    private static handleRouteNavigation(
        route: Route<string, any | undefined> | undefined, 
        appStateStatus: AppStateStatus | undefined = undefined
        ) {
        if (route == undefined || route == null) {
            // RUMM-1400 in some cases the route seem to be undefined
            return
        }
        const key = route.key;

        const predicate = DdRumReactNavigationTracking.viewNamePredicate;
        const screenName = predicate(route, route.name) ?? route.name;

        if (key != null && screenName != null) {
            if (appStateStatus === 'background') {
                DdRum.stopView(key);
            } else if (appStateStatus === 'active' || appStateStatus == undefined) {
                // case when app goes into foreground, 
                // in that case navigation listener won't be called
                DdRum.startView(key, screenName);
            }
        }
    }

    private static resolveNavigationStateChangeListener(): NavigationListener {
        if (DdRumReactNavigationTracking.navigationStateChangeListener == null) {
            DdRumReactNavigationTracking.navigationStateChangeListener = (event: EventArg<string, boolean, any>) => {
                let route = event.data?.state?.routes[event.data?.state?.index];

                if (route == undefined) {
                    // RUMM-1400 in some cases the route seem to be undefined
                    return
                }

                while (route.state != undefined) {
                    const nestedRoute = route.state.routes[route.state.index];
                    if (nestedRoute == undefined) {
                        // RUMM-1400 in some cases the route seem to be undefined
                        break;
                    }
                    route = nestedRoute
                }

                DdRumReactNavigationTracking.handleRouteNavigation(route);
            };
        }
        return DdRumReactNavigationTracking.navigationStateChangeListener;
    }

    private static registerAppStateListenerIfNeeded() {
        if (DdRumReactNavigationTracking.appStateListener == null) {
            DdRumReactNavigationTracking.appStateListener = (appStateStatus: AppStateStatus) => {

                const currentRoute = DdRumReactNavigationTracking.registeredContainer?.getCurrentRoute();
                if (currentRoute == undefined) {
                    return;
                }

                DdRumReactNavigationTracking.handleRouteNavigation(currentRoute, appStateStatus);
            };

            // AppState is singleton, so we should add a listener only once in the app lifetime
            AppState.addEventListener("change", DdRumReactNavigationTracking.appStateListener);
        }
    }

}

