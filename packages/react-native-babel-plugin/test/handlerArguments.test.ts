/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transformSync } from '@babel/core';
import { createRequire } from 'module';
import * as React from 'react';

import { DdBabelInteractionTracking } from '../../core/src/rum/instrumentation/interactionTracking/DdBabelInteractionTracking';
import plugin from '../src';

jest.mock('../../core/src/specs/NativeDdSdk', () => ({
    __esModule: true,
    default: { sendTelemetryLog: jest.fn() }
}));

const nodeRequire = createRequire(__filename);

describe.each(['classic', 'react-native'])(
    'handler arguments with %s preset',
    preset => {
        const addAction = jest.fn().mockResolvedValue(undefined);

        beforeEach(() => {
            addAction.mockClear();
            DdBabelInteractionTracking.config = {
                trackInteractions: true,
                useAccessibilityLabel: true
            };
            DdBabelInteractionTracking.attachRumInstance({ addAction } as any);
        });

        function render(params: string, received: string, kind = 'inline') {
            const callback = `(${params}) => { const result = ${received}; calls.push(result); return result; }`;
            const code = `
            import React from 'react';
            import { Text } from 'react-native';
            import { CustomButton } from './CustomButton';
            export const calls = [];
            export function render() {
                ${
                    kind === 'useCallback'
                        ? `const handler = React.useCallback(${callback}, []);`
                        : ''
                }
                return <CustomButton onPress={${
                    kind === 'useCallback' ? 'handler' : callback
                }}>
                    <Text testID="first" />
                    <Text testID="second" />
                </CustomButton>;
            }
        `;
            const output = transformSync(code, {
                filename: 'arguments.tsx',
                configFile: false,
                babelrc: false,
                presets:
                    preset === 'react-native'
                        ? ['module:@react-native/babel-preset']
                        : ['@babel/preset-react', '@babel/preset-typescript'],
                plugins: [
                    [
                        plugin,
                        {
                            actionNameAttribute: 'testID',
                            components: {
                                useContent: false,
                                useNamePrefix: false,
                                tracked: [
                                    {
                                        name: 'CustomButton',
                                        handlers: [
                                            { event: 'onPress', action: 'TAP' }
                                        ]
                                    }
                                ]
                            },
                            sessionReplay: { svgTracking: false }
                        }
                    ],
                    '@babel/plugin-transform-modules-commonjs'
                ]
            })?.code as string;
            const exports: Record<string, any> = {};
            // eslint-disable-next-line no-new-func
            new Function('require', 'exports', output)((id: string) => {
                if (id === 'react') {
                    return {
                        ...React,
                        useCallback: (handler: unknown) => handler
                    };
                }
                if (id === 'react-native') {
                    return { Text: 'Text' };
                }
                if (id === './CustomButton') {
                    return { CustomButton: 'CustomButton' };
                }
                if (id === '@datadog/mobile-react-native') {
                    return { DdBabelInteractionTracking };
                }
                return nodeRequire(id);
            }, exports);
            return {
                handler: exports.render().props.onPress,
                calls: exports.calls
            };
        }

        // The RN preset can lower hook callback defaults into the function body
        // before JSX is visited. Preserve existing behavior for that separate case;
        // verify hook normalization here while its parameter syntax is available.
        it.each(preset === 'classic' ? ['inline', 'useCallback'] : ['inline'])(
            'records the default index for a %s handler',
            kind => {
                const fixture = render('index = 1', '[index]', kind);
                expect(addAction).not.toHaveBeenCalled();
                expect(fixture.handler()).toEqual([1]);
                expect(fixture.calls).toEqual([[1]]);
                expect(addAction).toHaveBeenCalledTimes(1);
                expect(addAction.mock.calls[0][1]).toBe('second');
            }
        );

        it('uses the default for explicit undefined and preserves explicit zero', () => {
            const fixture = render('index = 1', '[index]');
            expect(fixture.handler(undefined)).toEqual([1]);
            expect(fixture.handler(0)).toEqual([0]);
            expect(addAction.mock.calls.map(call => call[1])).toEqual([
                'second',
                'first'
            ]);
        });

        it('uses an explicit compound index in a memoized callback', () => {
            const fixture = render('index', '[index]', 'useCallback');
            expect(fixture.handler(1)).toEqual([1]);
            expect(addAction.mock.calls[0][1]).toBe('second');
        });

        it('does not use an undeclared extra argument as a compound index', () => {
            const fixture = render('label', '[label]');
            expect(fixture.handler('label', 1)).toEqual(['label']);
            expect(addAction.mock.calls[0][1]).toBe('first');
        });

        it('includes rest arguments when the handler declares them', () => {
            const fixture = render('...values', 'values');
            expect(fixture.handler('label', 1)).toEqual(['label', 1]);
            expect(addAction.mock.calls[0][1]).toBe('second');
        });

        it('preserves defaults that reference preceding parameters', () => {
            const fixture = render('index = 1, next = index', '[index, next]');
            expect(fixture.handler()).toEqual([1, 1]);
            expect(addAction.mock.calls[0][1]).toBe('second');
        });

        it('preserves the wrapper arity', () => {
            expect(render('index', '[index]').handler.length).toBe(1);
            expect(render('index, next', '[index, next]').handler.length).toBe(
                2
            );
            expect(
                render('index, next = index', '[index, next]').handler.length
            ).toBe(1);
        });
    }
);
