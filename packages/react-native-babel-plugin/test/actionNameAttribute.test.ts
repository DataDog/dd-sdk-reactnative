/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transform } from '@babel/core';

import plugin from '../src/index';
import type { PluginOptions } from '../src/types';

// Covers how DD attribute values (`dd-action-name`, `accessibilityLabel` and the custom
// `actionNameAttribute`) reach the runtime depending on the JSX attribute value shape.

function transformCode(code: string) {
    const options: PluginOptions = {
        actionNameAttribute: 'testID',
        components: {
            useContent: true,
            useNamePrefix: false,
            tracked: [
                {
                    name: 'CustomButton',
                    handlers: [{ event: 'onPress', action: 'TAP' }]
                }
            ]
        },
        sessionReplay: { svgTracking: false }
    } as PluginOptions;

    return transform(code, {
        filename: 'file.tsx',
        presets: [
            ['@babel/preset-react', { runtime: 'classic' }],
            '@babel/preset-typescript'
        ],
        plugins: [
            [plugin, options],
            '@babel/plugin-transform-modules-commonjs'
        ],
        configFile: false
    })?.code as string;
}

/**
 * Transforms `code`, executes it with stubbed modules, presses every rendered
 * element and returns the `targetObject` each press handed to `wrapRumAction`.
 * Like the runtime, `getContent` is resolved when the wrapper runs; errors it
 * throws are collected in `contentErrors`.
 */
function pressAll(code: string, modules: Record<string, any> = {}) {
    const output = transformCode(code);
    const captured: Record<string, any>[] = [];
    const rendered: Record<string, any>[] = [];
    const contentErrors: unknown[] = [];
    let isResolvingContent = false;

    const DdBabelInteractionTracking = {
        getInstance: () => DdBabelInteractionTracking,
        wrapRumAction: (
            fn: (...a: any[]) => any,
            _type: string,
            target: Record<string, any>
        ) => (...args: any[]) => {
            captured.push(target);
            isResolvingContent = true;
            try {
                target.getContent?.();
            } catch (e) {
                contentErrors.push(e);
            } finally {
                isResolvingContent = false;
            }
            return fn?.(...args);
        }
    };

    const React = {
        createElement: (_type: any, props: any) => {
            if (!isResolvingContent) {
                rendered.push(props || {});
            }
            return { props };
        },
        Fragment: 'Fragment',
        useCallback: (fn: any) => fn,
        // Like React, run the factory during render
        useMemo: (factory: () => any) => factory()
    };

    const allModules: Record<string, any> = {
        react: React,
        'react/jsx-runtime': {
            jsx: React.createElement,
            jsxs: React.createElement,
            Fragment: 'Fragment'
        },
        'react-native': {
            Button: 'Button',
            Pressable: 'Pressable',
            Text: 'Text'
        },
        '@datadog/mobile-react-native': {
            DdBabelInteractionTracking,
            __ddExtractText: () => []
        },
        './CustomButton': { CustomButton: 'CustomButton' },
        ...modules
    };

    const exportsObj: Record<string, any> = {};
    // eslint-disable-next-line no-new-func
    new Function('require', 'exports', 'React', output)(
        (name: string) => allModules[name],
        exportsObj,
        React
    );
    if (typeof exportsObj.render === 'function') {
        exportsObj.render();
    }

    for (const props of rendered) {
        props.onPress?.();
    }

    return { output, captured, contentErrors };
}

describe('Babel plugin: DD attribute values', () => {
    const testIDs = { './testIDs': { TestIDs: { someTestId: 'imported_id' } } };

    it('forwards string literal attributes', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            <Button testID="literal_id" onPress={() => {}} />;
        `);
        expect(captured[0].testID).toEqual(['literal_id']);
    });

    it('forwards string literals inside expression containers', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            <Button testID={"braced_id"} onPress={() => {}} />;
            <Button testID={\`tpl_id\`} onPress={() => {}} />;
        `);
        expect(captured[0].testID).toEqual(['braced_id']);
        expect(captured[1].testID).toEqual(['tpl_id']);
    });

    it('forwards module-level constants', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            const LOCAL_ID = 'local_const_id';
            <Button testID={LOCAL_ID} onPress={() => {}} />;
        `);
        expect(captured[0].testID).toEqual(['local_const_id']);
    });

    it('forwards imported constants object members', () => {
        const { output, captured } = pressAll(
            `
            import { Button } from 'react-native';
            import { TestIDs } from './testIDs';
            <Button testID={TestIDs.someTestId} onPress={() => {}} />;
        `,
            testIDs
        );
        expect(output).toContain('"testID": [_testIDs.TestIDs.someTestId]');
        expect(captured[0].testID).toEqual(['imported_id']);
    });

    it('forwards accessibilityLabel and dd-action-name expressions', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            const t = (k) => 'translated:' + k;
            <Button accessibilityLabel={t('save')} onPress={() => {}} />;
            <Button dd-action-name={"braced_name"} onPress={() => {}} />;
        `);
        expect(captured[0].accessibilityLabel).toEqual(['translated:save']);
        expect(captured[1]['dd-action-name']).toEqual(['braced_name']);
    });

    it('evaluates expressions on press, before running the handler', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            const ids = { current: 'before' };
            <Button testID={ids.current} onPress={() => { ids.current = 'after'; }} />;
        `);
        expect(captured[0].testID).toEqual(['before']);
    });

    it('forwards expressions declaring their own bindings', () => {
        const { captured } = pressAll(`
            import { Button } from 'react-native';
            const items = [{ id: 'a' }, { id: 'b' }];
            <Button testID={items.map(item => item.id).join(',')} onPress={() => {}} />;
        `);
        expect(captured[0].testID).toEqual(['a,b']);
    });

    describe('inline handlers', () => {
        it('forwards per-item values inside .map()', () => {
            const { captured } = pressAll(`
                import { Button } from 'react-native';
                const items = [{ id: 'a' }, { id: 'b' }];
                items.map(item => <Button key={item.id} testID={item.id} onPress={() => {}} />);
            `);
            expect(captured.map(x => x.testID)).toEqual([['a'], ['b']]);
        });

        it('does not forward nested child values from a scope the wrapper cannot see', () => {
            const { output, captured } = pressAll(`
                import { Pressable, Text } from 'react-native';
                const items = [{ id: 'a' }];
                <Pressable testID="parent_id" onPress={() => {}}>
                    {items.map(i => <Text key={i.id} testID={i.id}>x</Text>)}
                </Pressable>;
            `);
            expect(output).not.toMatch(/"testID": \[[^\]]*i\.id/);
            expect(captured[0].testID).toStrictEqual(['parent_id', undefined]);
        });
    });

    describe('memoized handlers (useCallback)', () => {
        it('keeps program-scope expressions in the hoisted args', () => {
            const { output, captured } = pressAll(
                `
                import React from 'react';
                import { Button } from 'react-native';
                import { TestIDs } from './testIDs';
                export function render() {
                    const handlePress = React.useCallback(() => {}, []);
                    return <Button testID={TestIDs.someTestId} onPress={handlePress} />;
                }
            `,
                testIDs
            );
            expect(output).toMatch(
                /useCallback\([\s\S]*"testID": \[_testIDs\.TestIDs\.someTestId\][\s\S]*\}, \[\]\)/
            );
            expect(captured[0].testID).toEqual(['imported_id']);
        });

        it('keeps component-scope expressions in the hoisted args', () => {
            const { captured } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render() {
                    const id = 'component_id';
                    const handlePress = React.useCallback(() => {}, []);
                    return <Button testID={id} onPress={handlePress} />;
                }
            `);
            expect(captured[0].testID).toEqual(['component_id']);
        });

        it('drops .map() param expressions from the hoisted args', () => {
            const { output, captured } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render() {
                    const items = [{ id: 'a', name: 'Item A' }];
                    const handlePress = React.useCallback(() => {}, []);
                    return items.map(item => <Button key={item.id} testID={item.id} title={item.name} onPress={handlePress} />);
                }
            `);
            const hoisted = output.slice(0, output.indexOf('items.map'));
            expect(hoisted).not.toContain('item.');
            expect(captured[0].testID).toStrictEqual([undefined]);
            // Previously `[item.name]` was hoisted and threw a ReferenceError
            expect(() => captured[0].getContent()).not.toThrow();
        });

        it('drops children referencing .map() params from the hoisted content', () => {
            const { output, captured } = pressAll(`
                import React from 'react';
                import { Pressable, Text } from 'react-native';
                export function render() {
                    const items = [{ id: 'a', name: 'Item A' }];
                    const handlePress = React.useCallback(() => {}, []);
                    return items.map(item => (
                        <Pressable key={item.id} title="static" onPress={handlePress}>
                            <Text>{item.name}</Text>
                        </Pressable>
                    ));
                }
            `);
            const hoisted = output.slice(0, output.indexOf('items.map'));
            expect(hoisted).not.toContain('item.');
            expect(hoisted).toContain('["static"]');
            expect(() => captured[0].getContent()).not.toThrow();
        });

        it('keeps children whose callbacks declare their own bindings in the hoisted content', () => {
            const output = transformCode(`
                import React from 'react';
                import { Pressable, Text } from 'react-native';
                export function render() {
                    const items = [{ id: 'a', name: 'Item A' }];
                    const handlePress = React.useCallback(() => {}, []);
                    return (
                        <Pressable onPress={handlePress}>
                            {items.map(i => <Text key={i.id}>{i.name}</Text>)}
                        </Pressable>
                    );
                }
            `);
            const hoisted = output.slice(
                0,
                output.indexOf('return /*#__PURE__*/')
            );
            expect(hoisted).toContain('items.map(i =>');
        });

        it('keeps expressions declaring their own bindings in the hoisted args', () => {
            const { captured } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                const items = [{ id: 'a' }, { id: 'b' }];
                export function render() {
                    const handlePress = React.useCallback(() => {}, []);
                    return <Button testID={items.map(item => item.id).join(',')} onPress={handlePress} />;
                }
            `);
            expect(captured[0].testID).toEqual(['a,b']);
        });
    });

    describe('compound component positions', () => {
        it('keeps an undefined placeholder for dropped values', () => {
            const { captured } = pressAll(`
                import { Pressable, Text } from 'react-native';
                const items = [{ id: 'a' }];
                <Pressable testID="first" onPress={() => {}}>
                    {items.map(i => <Text key={i.id} testID={i.id}>x</Text>)}
                    <Text testID="third">y</Text>
                </Pressable>;
            `);
            expect(captured[0].testID).toStrictEqual([
                'first',
                undefined,
                'third'
            ]);
        });
    });

    describe('memoized handlers (useMemo)', () => {
        // React runs the factory during render at the hook call, so component bindings
        // declared after it are still in their temporal dead zone
        it('drops component bindings and keeps program scope values', () => {
            const code = `
                import React from 'react';
                import { Button } from 'react-native';
                import { TestIDs } from './testIDs';
                export function render() {
                    const handler = React.useMemo(() => () => {}, []);
                    const id = 'declared_after';
                    return (
                        <>
                            <Button testID={id} onPress={handler} />
                            <Button testID={TestIDs.someTestId} onPress={handler} />
                        </>
                    );
                }
            `;
            const output = transformCode(code);
            const factory = output.slice(
                output.indexOf('useMemo('),
                output.indexOf("const id = 'declared_after'")
            );
            expect(factory).not.toMatch(/"testID": \[id\]/);
            expect(() =>
                pressAll(code, {
                    './testIDs': { TestIDs: { someTestId: 'imported_id' } }
                })
            ).not.toThrow();
        });

        it('keeps component params', () => {
            const { captured } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render(props = { id: 'param_id' }) {
                    const handler = React.useMemo(() => () => {}, []);
                    return <Button testID={props.id} onPress={handler} />;
                }
            `);
            expect(captured[0].testID).toStrictEqual(['param_id']);
        });

        it('keeps bindings declared before the hook', () => {
            const { captured } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render() {
                    const before = 'declared_before';
                    const handler = React.useMemo(() => () => {}, []);
                    return <Button testID={before} onPress={handler} />;
                }
            `);
            expect(captured[0].testID).toStrictEqual(['declared_before']);
        });

        it('drops content referencing bindings declared after the hook', () => {
            const { output, contentErrors } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render() {
                    const handler = React.useMemo(() => () => {}, []);
                    const title = 'declared_after';
                    return <Button title={title} onPress={handler} />;
                }
            `);
            const factory = output.slice(
                output.indexOf('useMemo('),
                output.indexOf("const title = 'declared_after'")
            );
            expect(factory).not.toContain('[title]');
            expect(contentErrors).toStrictEqual([]);
        });

        it('keeps content referencing bindings declared before the hook', () => {
            const { output } = pressAll(`
                import React from 'react';
                import { Button } from 'react-native';
                export function render() {
                    const title = 'declared_before';
                    const handler = React.useMemo(() => () => {}, []);
                    return <Button title={title} onPress={handler} />;
                }
            `);
            const factory = output.slice(
                output.indexOf('useMemo('),
                output.indexOf('return /*#__PURE__*/')
            );
            expect(factory).toContain('[title]');
        });

        it('keeps program scope values in the factory args', () => {
            const output = transformCode(`
                import React from 'react';
                import { Button } from 'react-native';
                import { TestIDs } from './testIDs';
                export function render() {
                    const handler = React.useMemo(() => () => {}, []);
                    return <Button testID={TestIDs.someTestId} onPress={handler} />;
                }
            `);
            expect(output).toMatch(
                /useMemo\([\s\S]*"testID": \[_testIDs\.TestIDs\.someTestId\][\s\S]*\}, \[\]\)/
            );
        });
    });

    describe('JSX nested inside getContent expressions', () => {
        // JSX nested in callbacks, non-JSX branches or attribute values is not reached by
        // the direct conversion, and the JSX transform never visits code hoisted into hooks
        const hasRawJsx = (code: string) => /<[A-Z_][\w.]*[\s>/]/.test(code);

        it('converts JSX inside a .map() callback in hoisted children', () => {
            const code = `
                import React from 'react';
                import { Pressable, Text } from 'react-native';
                const ITEMS = [{ id: 'a', name: 'Item A' }];
                export function render() {
                    const handlePress = React.useCallback(() => {}, []);
                    return (
                        <Pressable onPress={handlePress}>
                            {ITEMS.map(i => <Text key={i.id}>{i.name}</Text>)}
                        </Pressable>
                    );
                }
            `;
            expect(hasRawJsx(transformCode(code))).toBe(false);
            expect(() => pressAll(code)).not.toThrow();
        });

        it('converts JSX in non-JSX ternary branches and attribute values', () => {
            const code = `
                import React from 'react';
                import { Pressable, Text } from 'react-native';
                const ITEMS = [{ id: 'a', name: 'Item A' }];
                export function render() {
                    const handlePress = React.useCallback(() => {}, []);
                    return (
                        <Pressable title={<Text>title</Text>} onPress={handlePress}>
                            {ITEMS.length ? ITEMS.map(i => <Text key={i.id}>{i.name}</Text>) : null}
                            <Text icon={<Text>icon</Text>}>label</Text>
                        </Pressable>
                    );
                }
            `;
            expect(hasRawJsx(transformCode(code))).toBe(false);
            expect(() => pressAll(code)).not.toThrow();
        });
    });
});
