/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';

import { DdEventsInterceptor } from './DdEventsInterceptor';
import type EventsInterceptor from './EventsInterceptor';
import NoOpEventsInterceptor from './NoOpEventsInterceptor';
import { areObjectShallowEqual } from './ShallowObjectEqualityChecker';

const PROPERTY_FUNCTION_TYPE = 'function';

/**
 * Provides RUM auto-instrumentation feature to track user interaction as RUM events.
 * For now we are only covering the "onPress" events.
 */
export class DdRumUserInteractionTracking {
    private static isTracking = false;
    private static eventsInterceptor: EventsInterceptor = new NoOpEventsInterceptor();

    /**
     * Starts tracking user interactions and sends a RUM Action event every time a new interaction was detected.
     * Please note that we are only considering as valid - for - tracking only the user interactions that have
     * a visible output (either an UI state change or a Resource request)
     */
    static startTracking(): void {
        // extra safety to avoid wrapping more than 1 time this function
        if (DdRumUserInteractionTracking.isTracking) {
            InternalLog.log(
                'Datadog SDK is already tracking interactions',
                SdkVerbosity.WARN
            );
            return;
        }
        DdRumUserInteractionTracking.eventsInterceptor = new DdEventsInterceptor();
        const original = React.createElement;
        React.createElement = (
            element: any,
            props: any,
            ...children: any
        ): any => {
            // check if we have an 'onPress' property and that this is really a function
            if (props && typeof props.onPress === PROPERTY_FUNCTION_TYPE) {
                const originalOnPress = props.onPress;
                props.onPress = (...args: any[]) => {
                    DdRumUserInteractionTracking.eventsInterceptor.interceptOnPress(
                        ...args
                    );
                    return originalOnPress(...args);
                };
                // we store the original onPress prop so we can keep memoization working
                props.__DATADOG_INTERNAL_ORIGINAL_ON_PRESS__ = originalOnPress;
            }
            return original(element, props, ...children);
        };

        const originalMemo = React.memo;
        React.memo = (
            component: any,
            propsAreEqual?: (prevProps: any, newProps: any) => boolean
        ) => {
            return originalMemo(component, (prev, next) => {
                if (!next.onPress || !prev.onPress) {
                    return propsAreEqual
                        ? propsAreEqual(prev, next)
                        : areObjectShallowEqual(prev, next);
                }
                // we replace "our" onPress from the props by the original for comparison
                const { onPress: _prevOnPress, ...partialPrevProps } = prev;
                const prevProps = {
                    ...partialPrevProps,
                    onPress: prev.__DATADOG_INTERNAL_ORIGINAL_ON_PRESS__
                };

                const { onPress: _nextOnPress, ...partialNextProps } = next;
                const nextProps = {
                    ...partialNextProps,
                    onPress: next.__DATADOG_INTERNAL_ORIGINAL_ON_PRESS__
                };

                // if no comparison function is provided we do shallow comparison
                return propsAreEqual
                    ? propsAreEqual(prevProps, nextProps)
                    : areObjectShallowEqual(nextProps, prevProps);
            });
        };

        DdRumUserInteractionTracking.isTracking = true;
        InternalLog.log(
            'Datadog SDK is tracking interactions',
            SdkVerbosity.INFO
        );
    }
}
