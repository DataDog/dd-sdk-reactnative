/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import { DdRum } from '../../index';

declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export default class DdRumReactNavigationTracking {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static navigationStateChangeListener: NavigationListener;

    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static startTrackingViews(navigationRef: NavigationContainerRef | null): void {
        if (navigationRef != null) {
            const listener = this.resolveNavigationStateChangeListener();
            this.handleRouteNavigation(navigationRef.getCurrentRoute());
            navigationRef.addListener("state", listener);
        }
    }

    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static stopTrackingViews(navigationRef?: NavigationContainerRef): void {
        navigationRef?.removeListener("state", this.navigationStateChangeListener);
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
                this.handleRouteNavigation(event.data?.state?.routes[event.data?.state?.index]);
            };
        }
        return this.navigationStateChangeListener;
    }

}

