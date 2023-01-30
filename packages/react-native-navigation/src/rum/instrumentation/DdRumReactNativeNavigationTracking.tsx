/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum, InternalLog, SdkVerbosity } from '@datadog/mobile-react-native';
import type { ComponentDidAppearEvent } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';
import type {
    AppStateStatus,
    EmitterSubscription,
    NativeEventSubscription
} from 'react-native';
import { AppState } from 'react-native';

export type ViewNamePredicate = (
    event: ComponentDidAppearEvent,
    trackedName: string
) => string | null;

// AppStateStatus can have values:
//     'active' - The app is running in the foreground
//     'background' - The app is running in the background. The user is either in another app or on the home screen
//     'inactive' [iOS] - This is a transition state that currently never happens for typical React Native apps.
//     'unknown' [iOS] - Initial value until the current app state is determined
//     'extension' [iOS] - The app is running as an app extension
declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null;

/**
 * Provides RUM integration for the [React Native Navigation](https://wix.github.io/react-native-navigation) API.
 */
export class DdRumReactNativeNavigationTracking {
    private static isTracking = false;
    private static eventSubscription:
        | EmitterSubscription
        | undefined = undefined;
    private static appStateSubscription?: NativeEventSubscription;

    private static viewNamePredicate: ViewNamePredicate;
    private static lastView?: {
        key: string;
        name: string;
    };

    /**
     * Starts tracking the Navigation and sends a RUM View event every time a root View component appear/disappear.
     */
    static startTracking(
        viewNamePredicate: ViewNamePredicate = function (
            _event: ComponentDidAppearEvent,
            trackedName: string
        ) {
            return trackedName;
        }
    ): void {
        // extra safety to avoid wrapping more than 1 time this function
        if (DdRumReactNativeNavigationTracking.isTracking) {
            return;
        }

        DdRumReactNativeNavigationTracking.eventSubscription = Navigation.events().registerComponentDidAppearListener(
            (event: ComponentDidAppearEvent) => {
                const predicate =
                    DdRumReactNativeNavigationTracking.viewNamePredicate;
                const screenName =
                    predicate(event, event.componentName) ??
                    event.componentName;
                DdRum.startView(event.componentId, screenName);
                DdRumReactNativeNavigationTracking.lastView = {
                    key: event.componentId,
                    name: screenName
                };
            }
        );

        DdRumReactNativeNavigationTracking.isTracking = true;
        DdRumReactNativeNavigationTracking.viewNamePredicate = viewNamePredicate;
        this.appStateSubscription = AppState.addEventListener(
            'change',
            DdRumReactNativeNavigationTracking.appStateListener
        );
    }

    /**
     * Stops tracking Navigation.
     */
    static stopTracking(): void {
        if (!DdRumReactNativeNavigationTracking.isTracking) {
            return;
        }
        if (DdRumReactNativeNavigationTracking.eventSubscription) {
            DdRumReactNativeNavigationTracking.eventSubscription.remove();
        }
        // For versions of React Native below 0.65, addEventListener does not return a subscription.
        // We have to call AppState.removeEventListener instead.
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        } else {
            AppState.removeEventListener(
                'change',
                DdRumReactNativeNavigationTracking.appStateListener
            );
        }

        DdRumReactNativeNavigationTracking.isTracking = false;
        DdRumReactNativeNavigationTracking.viewNamePredicate = function (
            _event: ComponentDidAppearEvent,
            trackedName: string
        ) {
            return trackedName;
        };
    }

    private static appStateListener: AppStateListener = (
        appStateStatus: AppStateStatus
    ) => {
        const lastView = DdRumReactNativeNavigationTracking.lastView;
        if (lastView === undefined) {
            InternalLog.log(
                `We could not determine the route when changing the application state to: ${appStateStatus}. No RUM View event will be sent in this case.`,
                SdkVerbosity.ERROR
            );
            return;
        }

        if (appStateStatus === 'background') {
            DdRum.stopView(lastView.key);
        } else if (
            appStateStatus === 'active' ||
            appStateStatus === undefined
        ) {
            // case when app goes into foreground,
            // in that case navigation listener won't be called
            DdRum.startView(lastView.key, lastView.name);
        }
    };
}
