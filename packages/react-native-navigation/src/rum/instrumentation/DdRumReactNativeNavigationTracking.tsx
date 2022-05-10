/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '@datadog/mobile-react-native';
import type { ComponentDidAppearEvent } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';
import React from 'react';

export type ViewNamePredicate = (
    event: ComponentDidAppearEvent,
    trackedName: string
) => string;

/**
 * Provides RUM integration for the [React Native Navigation](https://wix.github.io/react-native-navigation) API.
 */
export class DdRumReactNativeNavigationTracking {
    private static isTracking = false;
    private static trackedComponentIds: Array<any> = [];
    private static originalCreateElement: any = undefined;

    private static viewNamePredicate: ViewNamePredicate;

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
        const original = React.createElement;
        DdRumReactNativeNavigationTracking.originalCreateElement = original;
        React.createElement = (
            element: any,
            props: any,
            ...children: any
        ): any => {
            if (
                props &&
                props.componentId != undefined &&
                !DdRumReactNativeNavigationTracking.trackedComponentIds.includes(
                    props.componentId
                )
            ) {
                const componentId = props.componentId;
                Navigation.events().registerComponentListener(
                    {
                        componentDidAppear: (
                            event: ComponentDidAppearEvent
                        ) => {
                            const predicate =
                                DdRumReactNativeNavigationTracking.viewNamePredicate;
                            const screenName =
                                predicate(event, event.componentName) ??
                                event.componentName;
                            DdRum.startView(componentId, screenName);
                        },
                        componentDidDisappear: () => {
                            DdRum.stopView(componentId);
                        }
                    },
                    componentId
                );
                DdRumReactNativeNavigationTracking.trackedComponentIds.push(
                    componentId
                );
            }

            return original(element, props, ...children);
        };
        DdRumReactNativeNavigationTracking.isTracking = true;
        DdRumReactNativeNavigationTracking.viewNamePredicate = viewNamePredicate;
    }

    /**
     * Stops tracking Navigation.
     */
    static stopTracking(): void {
        if (!DdRumReactNativeNavigationTracking.isTracking) {
            return;
        }
        if (
            DdRumReactNativeNavigationTracking.originalCreateElement !=
            undefined
        ) {
            React.createElement =
                DdRumReactNativeNavigationTracking.originalCreateElement;
        }
        DdRumReactNativeNavigationTracking.trackedComponentIds.splice(
            0,
            DdRumReactNativeNavigationTracking.trackedComponentIds.length
        );
        DdRumReactNativeNavigationTracking.isTracking = false;
        DdRumReactNativeNavigationTracking.viewNamePredicate = function (
            _event: ComponentDidAppearEvent,
            trackedName: string
        ) {
            return trackedName;
        };
    }
}
