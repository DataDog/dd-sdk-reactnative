/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transformSync } from '@babel/core';

import type { PluginOptions } from '../src/types';
import plugin from '../src';

function renderHandler(
    code: string,
    {
        trackingAvailable = true,
        mode = 'default'
    }: {
        trackingAvailable?: boolean;
        mode?: 'default' | 'delayed';
    } = {}
) {
    const captured: Record<string, any>[] = [];
    const content: unknown[] = [];
    const tracking = {
        getInstance: () => (trackingAvailable ? tracking : null),
        wrapRumAction: (
            handler: (...args: any[]) => any,
            _type: string,
            target: Record<string, any>
        ) => (...args: any[]) => {
            captured.push(target);
            content.push(target.getContent?.());
            return handler?.(...args);
        }
    };
    const React = {
        createElement: (_type: unknown, props: unknown) => ({ props }),
        useCallback: (handler: unknown) => handler
    };
    const options: PluginOptions = {
        actionNameAttribute: 'testID',
        components: {
            useContent: true,
            useNamePrefix: false,
            tracked: [
                {
                    name: 'CustomButton',
                    handlers: [{ event: 'onPress', action: 'TAP', mode }]
                }
            ]
        },
        sessionReplay: { svgTracking: false }
    };
    const output = transformSync(code, {
        filename: 'shadowing.tsx',
        configFile: false,
        babelrc: false,
        presets: [
            ['@babel/preset-react', { runtime: 'classic' }],
            '@babel/preset-typescript'
        ],
        plugins: [[plugin, options], '@babel/plugin-transform-modules-commonjs']
    })?.code as string;
    const modules: Record<string, any> = {
        react: React,
        'react-native': { Button: 'Button' },
        'react/jsx-runtime': { jsx: React.createElement, Fragment: 'Fragment' },
        './CustomButton': { CustomButton: 'CustomButton' },
        '@datadog/mobile-react-native': {
            DdBabelInteractionTracking: tracking,
            __ddExtractText: (_node: unknown, candidates: unknown[]) =>
                candidates
        }
    };
    const exports: Record<string, any> = {};
    // eslint-disable-next-line no-new-func
    new Function('require', 'exports', 'React', output)(
        (id: string) => modules[id],
        exports,
        React
    );
    return {
        handler: exports.render().props.onPress,
        captured,
        content,
        exports
    };
}

describe('generated handler bindings', () => {
    it.each(['inline', 'useCallback', 'named useCallback'])(
        'keeps metadata in the JSX scope for %s handlers',
        kind => {
            const original = 'data => { calls.push(data); return data; }';
            const declaration =
                kind === 'useCallback'
                    ? `const handler = React.useCallback(${original}, []);`
                    : kind === 'named useCallback'
                    ? `const callback = ${original}; const handler = React.useCallback(callback, []);`
                    : '';
            const fixture = renderHandler(`
                import React from 'react';
                import { Button } from 'react-native';
                export const calls = [];
                export function render() {
                    const data = { ids: { save: 'correct_id' } };
                    ${declaration}
                    return <Button testID={data.ids.save} title={data.ids.save}
                        onPress={${
                            kind === 'inline' ? original : 'handler'
                        }} />;
                }
            `);
            const event = { nativeEvent: { target: 1 } };
            expect(fixture.handler(event)).toBe(event);
            expect(fixture.exports.calls).toEqual([event]);
            expect(fixture.captured).toHaveLength(1);
            expect(fixture.captured[0].testID).toEqual(['correct_id']);
            expect(fixture.captured[0].handlerArgs).toEqual([event]);
            expect(fixture.content).toEqual([['correct_id']]);
        }
    );

    it.each([
        {
            params: '{ data }',
            args: [{ data: 'argument' }],
            expected: 'argument'
        },
        { params: '[data]', args: [['argument']], expected: 'argument' },
        {
            params: '...data',
            args: ['first', 'second'],
            expected: ['first', 'second']
        },
        { params: '{ data = "default" }', args: [{}], expected: 'default' }
    ])(
        'does not introduce bindings from $params into the wrapper',
        ({ params, args, expected }) => {
            const fixture = renderHandler(`
            import { Button } from 'react-native';
            export const calls = [];
            export function render() {
                const data = { ids: { save: 'correct_id' } };
                return <Button testID={data.ids.save}
                    onPress={(${params}) => { calls.push(data); return data; }} />;
            }
        `);
            expect(fixture.handler(...args)).toEqual(expected);
            expect(fixture.exports.calls).toEqual([expected]);
            expect(fixture.captured[0].testID).toEqual(['correct_id']);
            expect(fixture.captured[0].handlerArgs).toEqual(args);
        }
    );

    it.each([
        { trackingAvailable: true, params: 'data = getDefault()', args: [] },
        { trackingAvailable: false, params: 'data = getDefault()', args: [] },
        {
            trackingAvailable: true,
            params: '{ data = getDefault() }',
            args: [{}]
        },
        {
            trackingAvailable: false,
            params: '{ data = getDefault() }',
            args: [{}]
        }
    ])(
        'evaluates $params once with tracking available=$trackingAvailable',
        ({ trackingAvailable, params, args }) => {
            const fixture = renderHandler(
                `
                import { Button } from 'react-native';
                export const calls = [];
                export function render() {
                    const data = { ids: { save: 'correct_id' } };
                    const getDefault = () => { calls.push('default'); return 'argument'; };
                    return <Button testID={data.ids.save}
                        onPress={(${params}) => { calls.push(data); return data; }} />;
                }
            `,
                { trackingAvailable }
            );
            expect(fixture.handler(...args)).toBe('argument');
            expect(fixture.exports.calls).toEqual(['default', 'argument']);
            expect(fixture.captured).toHaveLength(trackingAvailable ? 1 : 0);
            if (trackingAvailable) {
                expect(fixture.captured[0].testID).toEqual(['correct_id']);
                expect(fixture.captured[0].handlerArgs).toEqual(
                    params.startsWith('data =') ? ['argument'] : args
                );
            }
        }
    );

    describe.each([true, false])(
        'optional handlers with tracking available=%s',
        trackingAvailable => {
            it.each(['null', 'undefined'])(
                'preserves %s for identifiers and members in both modes',
                value => {
                    for (const mode of ['default', 'delayed'] as const) {
                        for (const reference of ['handler', 'props.onPress']) {
                            const fixture = renderHandler(
                                `
                                import { CustomButton } from './CustomButton';
                                export function render() {
                                    const handler = ${value};
                                    const props = { get onPress() { return handler; } };
                                    return <CustomButton onPress={${reference}} />;
                                }
                            `,
                                { trackingAvailable, mode }
                            );
                            expect(fixture.handler).toBe(
                                value === 'null' ? null : undefined
                            );
                            expect(fixture.captured).toEqual([]);
                        }
                    }
                }
            );
        }
    );

    it.each([true, false])(
        'evaluates a member handler once with tracking available=%s',
        trackingAvailable => {
            const fixture = renderHandler(
                `
                import { Button } from 'react-native';
                export let reads = 0;
                export const calls = [];
                export function render() {
                    const props = {
                        get onPress() {
                            reads++;
                            return (...args) => { calls.push(args); return args; };
                        }
                    };
                    return <Button onPress={props.onPress} />;
                }
            `,
                { trackingAvailable }
            );
            expect(fixture.exports.reads).toBe(1);
            expect(fixture.handler('first', 2)).toEqual(['first', 2]);
            expect(fixture.exports.reads).toBe(1);
            expect(fixture.exports.calls).toEqual([['first', 2]]);
            expect(fixture.captured).toHaveLength(trackingAvailable ? 1 : 0);
        }
    );

    it.each([true, false])(
        'captures the handler value at render with tracking available=%s',
        trackingAvailable => {
            const fixture = renderHandler(
                `
                import { Button } from 'react-native';
                let handler = () => 'original';
                export function changeHandler() { handler = () => 'replacement'; }
                export function render() { return <Button onPress={handler} />; }
            `,
                { trackingAvailable }
            );
            fixture.exports.changeHandler();
            expect(fixture.handler()).toBe('original');
        }
    );

    it('avoids customer bindings that resemble generated names', () => {
        const fixture = renderHandler(`
            import { Button } from 'react-native';
            export function render() {
                const _ddArg = 'test_id';
                const _ddArg2 = 'explicit_name';
                const args = 'accessible_name';
                const _dd_arg0 = 'content';
                return <Button testID={_ddArg} dd-action-name={_ddArg2}
                    accessibilityLabel={args} title={_dd_arg0}
                    onPress={({ value }) => value} />;
            }
        `);
        const event = { value: 'argument' };
        expect(fixture.handler(event)).toBe('argument');
        expect(fixture.captured[0]).toMatchObject({
            testID: ['test_id'],
            'dd-action-name': ['explicit_name'],
            accessibilityLabel: ['accessible_name'],
            handlerArgs: [event]
        });
        expect(fixture.content).toEqual([['content']]);
    });

    it('does not rename local bindings inside a parameter default', () => {
        const fixture = renderHandler(`
            import { Button } from 'react-native';
            export function render() {
                const data = { ids: { save: 'correct_id' } };
                return <Button testID={data.ids.save} onPress={(
                    data = 'argument',
                    next = data,
                    local = (() => { const data = 'local'; return data; })()
                ) => [data, next, local]} />;
            }
        `);
        expect(fixture.handler()).toEqual(['argument', 'argument', 'local']);
        expect(fixture.captured[0].testID).toEqual(['correct_id']);
        expect(fixture.captured[0].handlerArgs).toEqual([
            'argument',
            'argument',
            'local'
        ]);
    });

    it('does not reuse a customer parameter as a destructuring placeholder', () => {
        const fixture = renderHandler(`
            import { Button } from 'react-native';
            export function render() {
                const _ddArg = 'correct_id';
                return <Button testID={_ddArg}
                    onPress={({ value }, _dd_arg0) => [value, _dd_arg0]} />;
            }
        `);
        const event = { value: 'first' };
        expect(fixture.handler(event, 'second')).toEqual(['first', 'second']);
        expect(fixture.captured[0].testID).toEqual(['correct_id']);
        expect(fixture.captured[0].handlerArgs).toEqual([event, 'second']);
    });

    it.each([true, false])(
        'forwards all arguments and the return value with tracking available=%s',
        trackingAvailable => {
            const fixture = renderHandler(
                `
                import { Button } from 'react-native';
                export const calls = [];
                export function render() {
                    const args = 'correct_id';
                    return <Button testID={args} onPress={(first, ...rest) => {
                        const result = [first, ...rest]; calls.push(result); return result;
                    }} />;
                }
            `,
                { trackingAvailable }
            );
            const event = { nativeEvent: { target: 1 } };
            const args = [event, 2, 'third'];
            expect(fixture.handler(...args)).toEqual(args);
            expect(fixture.exports.calls).toEqual([args]);
            if (trackingAvailable) {
                expect(fixture.captured[0].handlerArgs).toEqual(args);
                expect(fixture.captured[0].testID).toEqual(['correct_id']);
            }
        }
    );

    it.each([true, false])(
        'preserves promise identity and thrown errors with tracking available=%s',
        trackingAvailable => {
            const fixture = renderHandler(
                `
                import { Button } from 'react-native';
                export const result = Promise.resolve('result');
                export const error = new Error('original error');
                export function render() {
                    return <Button onPress={fail => { if (fail) throw error; return result; }} />;
                }
            `,
                { trackingAvailable }
            );
            expect(fixture.handler(false)).toBe(fixture.exports.result);
            expect(() => fixture.handler(true)).toThrow(fixture.exports.error);
        }
    );

    it.each([true, false])(
        'preserves delayed handlers with tracking available=%s',
        trackingAvailable => {
            const fixture = renderHandler(
                `
                import { CustomButton } from './CustomButton';
                export const calls = [];
                export function render() {
                    const data = { ids: { save: 'correct_id' } };
                    return <CustomButton testID={data.ids.save}
                        onPress={data => { calls.push(data); return data; }} />;
                }
            `,
                { trackingAvailable, mode: 'delayed' }
            );
            const handler = fixture.handler('outer argument');
            expect(fixture.exports.calls).toEqual([]);
            expect(fixture.captured).toEqual([]);
            expect(handler('inner argument')).toBe('inner argument');
            expect(fixture.exports.calls).toEqual(['inner argument']);
            if (trackingAvailable) {
                expect(fixture.captured[0].testID).toEqual(['correct_id']);
                expect(fixture.captured[0].handlerArgs).toEqual([
                    'outer argument'
                ]);
            }
        }
    );
});
