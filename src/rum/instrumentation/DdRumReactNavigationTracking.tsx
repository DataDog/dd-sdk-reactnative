/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import { DdRum } from '../../foundation';
import { AppState, AppStateStatus } from 'react-native';

declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null

declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export default class DdRumReactNavigationTracking {

    private static registeredContainer: NavigationContainerRef | null;
    
    private static navigationStateChangeListener: NavigationListener;

    private static appStateListener: AppStateListener;

    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static startTrackingViews(navigationRef: NavigationContainerRef | null): void {
        if (navigationRef == null) {
            return;
        }

        if (DdRumReactNavigationTracking.registeredContainer != null && this.registeredContainer !== navigationRef) {
            console.error('Cannot track new navigation container while another one is still tracked');
        } else if (DdRumReactNavigationTracking.registeredContainer == null) {
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
        }
    }

    private static handleRouteNavigation(route: Route<string, any | undefined> | undefined) {
        const key = route?.key;
        const screenName = route?.name;
        if (key != null && screenName != null) {
            DdRum.startView(key, screenName, Date.now(), {});
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
                const currentViewKey = currentRoute?.key;
                const currentViewName = currentRoute?.name;

                if (currentViewKey != null && currentViewName != null) {
                    if (appStateStatus === 'background') {
                        DdRum.stopView(currentViewKey, Date.now(), {});
                    } else if (appStateStatus === 'active') {
                        // case when app goes into foreground, in that case navigation listener
                        // won't be called
                        DdRum.startView(currentViewKey, currentViewName, Date.now(), {});
                    }
                }
            };

            // AppState is singleton, so we should add a listener only once in the app lifetime
            AppState.addEventListener("change", DdRumReactNavigationTracking.appStateListener);
        }
    }

}

