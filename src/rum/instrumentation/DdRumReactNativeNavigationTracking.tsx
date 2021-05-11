/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react'
import { Navigation } from 'react-native-navigation';
import { DdRum } from '../../foundation';

/**
* Provides RUM integration for the [React Native Navigation](https://wix.github.io/react-native-navigation) API.
*/
export default class DdRumReactNativeNavigationTracking {

    private static isTracking = false
    private static trackedComponentIds : Array<any> = [];

    /**
     * Starts tracking the Navigation and sends a RUM View event every time a root View component appear/disappear.
     */
    static startTracking(): void {
        // extra safety to avoid wrapping more than 1 time this function
        if (DdRumReactNativeNavigationTracking.isTracking) {
            return
        }
        const original = React.createElement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.createElement = (element: any, props: any, ...children: any): any => {
            if (
                props.componentId != undefined 
                && !DdRumReactNativeNavigationTracking.trackedComponentIds.includes(props.componentId)
            ) {
                const componentId = props.componentId
                Navigation.events().registerComponentListener(
                    {
                        componentDidAppear: () => {
                            DdRum.startView(componentId, componentId, Date.now(), {});
                        },
                        componentDidDisappear: () => {
                            DdRum.stopView(componentId, Date.now(), {});
                        },
                    },
                    componentId 
                );
                DdRumReactNativeNavigationTracking.trackedComponentIds.push(componentId);
            }

            return original(element, props, ...children)
        }
        DdRumReactNativeNavigationTracking.isTracking = true
    }
};