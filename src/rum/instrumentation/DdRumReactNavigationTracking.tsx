/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import { DdRum } from '../../dd-foundation';
import { AppState, AppStateStatus } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null

declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export default class DdRumReactNavigationTracking {

    private static registeredContainer: NavigationContainerRef | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        if (this.registeredContainer != null && this.registeredContainer !== navigationRef) {
            console.error('Cannot track new navigation container while another one is still tracked');
        } else if (this.registeredContainer == null) {
            const listener = this.resolveNavigationStateChangeListener();
            this.handleRouteNavigation(navigationRef.getCurrentRoute());
            navigationRef.addListener("state", listener);
            this.registeredContainer = navigationRef;
        }

        this.registerAppStateListenerIfNeeded();
    }

    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static stopTrackingViews(navigationRef: NavigationContainerRef | null): void {
        if (navigationRef != null) {
            navigationRef.removeListener("state", this.navigationStateChangeListener);
            this.registeredContainer = null;
        }
    }

    // eslint-disable-next-line
    private static handleRouteNavigation(route: Route<string, object | undefined> | undefined) {
        const key = route?.key;
        const screenName = route?.name;
        if (key != null && screenName != null) {
            DdRum.startView(key, screenName, new Date().getTime(), {});
        }
    }

    private static resolveNavigationStateChangeListener(): NavigationListener {
        if (this.navigationStateChangeListener == null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.navigationStateChangeListener = (event: EventArg<string, boolean, any>) => {
                let nestedRoute = event.data?.state?.routes[event.data?.state?.index];
                while (nestedRoute.state != undefined) {
                    nestedRoute = nestedRoute.state.routes[nestedRoute.state.index];
                }

                this.handleRouteNavigation(nestedRoute);
            };
        }
        return this.navigationStateChangeListener;
    }

    private static registerAppStateListenerIfNeeded() {
        if (this.appStateListener == null) {
            this.appStateListener = (appStateStatus: AppStateStatus) => {

                const currentRoute = this.registeredContainer?.getCurrentRoute();
                const currentViewKey = currentRoute?.key;
                const currentViewName = currentRoute?.name;

                if (currentViewKey != null && currentViewName != null) {
                    if (appStateStatus === 'background') {
                        DdRum.stopView(currentViewKey, new Date().getTime(), {});
                    } else if (appStateStatus === 'active') {
                        // case when app goes into foreground, in that case navigation listener
                        // won't be called
                        DdRum.startView(currentViewKey, currentViewName, new Date().getTime(), {});
                    }
                }
            };

            // AppState is singleton, so we should add a listener only once in the app lifetime
            AppState.addEventListener("change", this.appStateListener);
        }
    }

}

