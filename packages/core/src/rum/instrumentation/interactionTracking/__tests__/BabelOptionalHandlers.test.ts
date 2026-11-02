/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Babel is a development dependency of the workspace root.
// eslint-disable-next-line import/no-extraneous-dependencies
import { transformSync } from '@babel/core';
import { createRequire } from 'module';
import Pressability from 'react-native/Libraries/Pressability/Pressability';
import * as ReactNative from 'react-native';
import * as React from 'react';

import plugin from '../../../../../../react-native-babel-plugin/src';

const nodeRequire = createRequire(__filename);

function loadButtonFixture(trackingAvailable: boolean) {
    const trackAction = jest.fn();
    const tracking = {
        getInstance: () => (trackingAvailable ? tracking : null),
        wrapRumAction: (handler: (...args: any[]) => any) => (
            ...args: any[]
        ) => {
            trackAction();
            return handler?.(...args);
        }
    };
    // Reproduce #1509 independently of the example app: optional handlers must
    // remain absent after transforming a component with Metro's preset.
    const output = transformSync(
        `
            import React from 'react';
            import { Pressable } from 'react-native';

            export function OptionalHandlerButton({ onPress, onLongPress }) {
                return <Pressable onPress={onPress} onLongPress={onLongPress} />;
            }
        `,
        {
            filename: 'optional-handlers.tsx',
            configFile: false,
            babelrc: false,
            presets: ['module:@react-native/babel-preset'],
            plugins: [[plugin, { sessionReplay: { svgTracking: false } }]]
        }
    )?.code as string;
    const modules: Record<string, any> = {
        react: React,
        'react-native': ReactNative,
        '@datadog/mobile-react-native': {
            DdBabelInteractionTracking: tracking
        }
    };
    const exports: Record<string, any> = {};
    // eslint-disable-next-line no-new-func
    new Function('require', 'exports', output)(
        (id: string) => modules[id] ?? nodeRequire(id),
        exports
    );
    return { Button: exports.OptionalHandlerButton, trackAction };
}

describe.each([true, false])(
    'issue #1509 with tracking available=%s',
    trackingAvailable => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => {
            jest.clearAllTimers();
            jest.useRealTimers();
        });

        it.each([undefined, null, 'defined'])(
            'preserves short and long presses with onLongPress=%s',
            value => {
                const { Button, trackAction } = loadButtonFixture(
                    trackingAvailable
                );
                const onPress = jest.fn();
                const onLongPress = value === 'defined' ? jest.fn() : value;
                const element = Button({ onPress, onLongPress });
                // Exercise React Native's actual state machine, including its timer
                // and the onLongPress-presence check that suppresses onPress.
                const pressability = new Pressability(element.props);
                const handlers = pressability.getEventHandlers();
                const event = {
                    currentTarget: 1,
                    nativeEvent: { pageX: 0, pageY: 0 },
                    persist: jest.fn()
                } as any;

                handlers.onResponderGrant(event);
                jest.advanceTimersByTime(100);
                handlers.onResponderRelease(event);
                expect(onPress).toHaveBeenCalledTimes(1);
                if (typeof onLongPress === 'function') {
                    expect(onLongPress).not.toHaveBeenCalled();
                }

                handlers.onResponderGrant(event);
                jest.advanceTimersByTime(600);
                handlers.onResponderRelease(event);
                expect(onPress).toHaveBeenCalledTimes(
                    onLongPress == null ? 2 : 1
                );
                if (onLongPress == null) {
                    expect(element.props.onLongPress).toBe(onLongPress);
                }
                if (typeof onLongPress === 'function') {
                    expect(onLongPress).toHaveBeenCalledTimes(1);
                }
                expect(trackAction).toHaveBeenCalledTimes(
                    trackingAvailable ? 2 : 0
                );
                pressability.reset();
            }
        );
    }
);
