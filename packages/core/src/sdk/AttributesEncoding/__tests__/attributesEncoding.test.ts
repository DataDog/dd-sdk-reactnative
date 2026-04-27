/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdSdk } from '../../DdSdk';
import { encodeAttributes } from '../attributesEncoding';
import { warn } from '../utils';

jest.mock('../utils', () => ({
    ...jest.requireActual('../utils'),
    warn: jest.fn()
}));

const setEncoders = (encoders: any[]) => {
    (DdSdk as any)?._setAttributeEncodersForTesting(encoders);
};

describe('encodeAttributes', () => {
    beforeEach(() => {
        (warn as jest.Mock).mockClear();
        setEncoders([]);
    });

    it('wraps root string under context', () => {
        const result = encodeAttributes('foo');
        expect(result).toEqual({ context: 'foo' });
        expect(warn).toHaveBeenCalled();
    });

    it('wraps root number under context', () => {
        const result = encodeAttributes(123);
        expect(result).toEqual({ context: 123 });
        expect(warn).toHaveBeenCalled();
    });

    it('wraps root array under context', () => {
        const result = encodeAttributes([1, 2, 3]);
        expect(result).toEqual({ context: [1, 2, 3] });
        expect(warn).toHaveBeenCalled();
    });

    it('drops unsupported root function', () => {
        const result = encodeAttributes(() => {});
        expect(result).toEqual({});
        expect(warn).toHaveBeenCalled();
    });

    it('drops unsupported root symbol', () => {
        const result = encodeAttributes(Symbol('x'));
        expect(result).toEqual({});
        expect(warn).toHaveBeenCalled();
    });

    it('flattens nested objects using dot syntax', () => {
        const input = { user: { profile: { name: 'Alice' } } };
        const result = encodeAttributes(input);
        expect(result).toEqual({ 'user.profile.name': 'Alice' });
        expect(warn).not.toHaveBeenCalled();
    });

    it('keeps arrays as arrays inside objects', () => {
        const input = { tags: ['a', 'b'] };
        const result = encodeAttributes(input);
        expect(result).toEqual({ tags: ['a', 'b'] });
    });

    it('flattens nested arrays of objects', () => {
        const input = { arr: [{ x: 1 }, { y: 2 }] };
        const result = encodeAttributes(input);
        expect(result).toEqual({
            arr: [{ x: 1 }, { y: 2 }]
        });
    });

    it('applies custom attribute encoders before built-in ones', () => {
        setEncoders([
            {
                check: (v: any): v is Date => v instanceof Date,
                encode: (d: Date) => 'CUSTOM_DATE'
            }
        ]);

        const result = encodeAttributes({ now: new Date() });
        expect(result).toEqual({ now: 'CUSTOM_DATE' });
    });

    it('applies built-in Date encoder if no custom encoder is provided', () => {
        const date = new Date('2020-01-01T12:00:00Z');
        const result = encodeAttributes({ now: date });
        expect(typeof result.now).toBe('string');
        expect(result.now).toContain('2020');
    });

    it('applies built-in Error encoder', () => {
        const error = new Error('boom');
        const result = encodeAttributes({ err: error });
        expect(result['err.name']).toBe('Error');
        expect(result['err.message']).toBe('boom');
        expect(result['err.stack']).toContain('Error: boom');
    });

    it('applies built-in Map encoder', () => {
        const map = new Map<any, any>([
            ['k1', 1],
            ['k2', { nested: 'yes' }]
        ]);
        const result = encodeAttributes({ data: map });
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'k1',
                    keyType: 'string',
                    value: 1
                }),
                expect.objectContaining({
                    key: 'k2',
                    keyType: 'string',
                    'value.nested': 'yes'
                })
            ])
        );
    });

    it('drops unsupported nested values', () => {
        const input = { valid: 'ok', bad: () => {} };
        const result = encodeAttributes(input);
        expect(result).toEqual({ valid: 'ok' });
    });

    it('does not modify original object when dropping values', () => {
        const input = { valid: 'ok', bad: () => {} };
        const result = encodeAttributes(input);
        expect(result).toEqual({ valid: 'ok' });
        expect(input).toHaveProperty('bad');
    });

    it('does not modify original object when dropping nested invalid values', () => {
        const input = { user: { profile: { bad: () => {}, good: 'ok' } } };
        const userBefore = { ...input.user };
        const profileBefore = { ...input.user.profile };

        const result = encodeAttributes(input);

        // Encoder should flatten and drop invalid function
        expect(result).toEqual({ 'user.profile.good': 'ok' });

        // Verify that the original objects were not mutated or replaced
        expect(input.user).toEqual(userBefore);
        expect(input.user.profile).toEqual(profileBefore);
    });

    it('does not modify original array inside object', () => {
        const arr = [1, 2, () => {}];
        const input = { data: arr };
        const arrBefore = [...arr];

        const result = encodeAttributes(input);
        expect(result).toEqual({ data: [1, 2] }); // dropped the function
        expect(input.data).toEqual(arrBefore); // original array untouched
    });

    it('does not modify original nested arrays of objects', () => {
        const objA = { val: 1 };
        const objB = { bad: () => {} };
        const objC = { val: 2 };

        const input = {
            matrix: [[objA, objB], [objC]]
        };

        // capture snapshots
        const matrixBefore = input.matrix;
        const row0Before = input.matrix[0];
        const row1Before = input.matrix[1];
        const objA_before = { ...objA };
        const objB_before = { ...objB };
        const objC_before = { ...objC };

        const result = encodeAttributes(input);

        expect(result).toEqual({
            matrix: [
                [{ val: 1 }, {}], // objB sanitized
                [{ val: 2 }]
            ]
        });

        // check original references untouched
        expect(input.matrix).toBe(matrixBefore); // same outer array reference
        expect(input.matrix[0]).toBe(row0Before); // same row0 reference
        expect(input.matrix[1]).toBe(row1Before); // same row1 reference
        expect(objA).toEqual(objA_before); // object A unchanged
        expect(objB).toEqual(objB_before); // object B unchanged
        expect(objC).toEqual(objC_before); // object C unchanged
    });

    it('does not modify original Map when encoding', () => {
        const innerMap = new Map([['x', 1]]);
        const outerMap = new Map<any, any>([['inner', innerMap]]);
        const input = { outer: outerMap };

        const snapshot = new Map(outerMap);
        const innerSnapshot = new Map(innerMap);

        const result = encodeAttributes(input);
        expect(result.outer).toBeInstanceOf(Array);
        expect(input.outer).toBe(outerMap); // same reference
        expect(Array.from(input.outer.entries())).toEqual(
            Array.from(snapshot.entries())
        );
        expect(Array.from(innerMap.entries())).toEqual(
            Array.from(innerSnapshot.entries())
        );
    });

    it('does not modify original object when attribute limit is reached', () => {
        const input: Record<string, string> = {};
        for (let i = 0; i < 200; i++) {
            input[`k${i}`] = `v${i}`;
        }
        const snapshot = { ...input };

        const result = encodeAttributes(input);
        expect(Object.keys(result)).toHaveLength(128);
        expect(input).toEqual(snapshot); // original still has 200 keys
    });

    it('does not modify original when sanitizing arrays of objects', () => {
        const obj1 = { ok: true };
        const obj2 = { bad: () => {} };
        const input = [obj1, obj2];

        // Capture pre-encode snapshots manually
        const obj1Before = { ...obj1 };
        const obj2Before = { ...obj2 };
        const arrayBefore = [...input];

        const result = encodeAttributes(input);

        expect(result).toEqual({ context: [{ ok: true }, {}] });
        expect(input).toEqual(arrayBefore);
        expect(input[0]).toEqual(obj1Before);
        expect(input[1]).toEqual(obj2Before);
    });

    it('handles deeply nested objects', () => {
        const deep = { level1: { level2: { level3: { value: 42 } } } };
        const result = encodeAttributes(deep);
        expect(result).toEqual({ 'level1.level2.level3.value': 42 });
    });

    it('handles object with manual dot keys', () => {
        const input = { 'user.profile.name': 'Bob' };
        const result = encodeAttributes(input);
        expect(result).toEqual({ 'user.profile.name': 'Bob' });
    });

    it('handles array with mixed values', () => {
        const input = [1, 'two', { nested: true }];
        const result = encodeAttributes(input);
        expect(result).toEqual({ context: [1, 'two', { nested: true }] });
    });

    it('handles empty object gracefully', () => {
        const result = encodeAttributes({});
        expect(result).toEqual({});
        expect(warn).not.toHaveBeenCalled();
    });

    it('handles empty array gracefully at root', () => {
        const result = encodeAttributes([]);
        expect(result).toEqual({ context: [] });
        expect(warn).toHaveBeenCalled();
    });

    it('handles NaN and Infinity by dropping them', () => {
        const result = encodeAttributes({
            bad1: NaN,
            bad2: Infinity,
            good: 42
        });
        expect(result).toEqual({ good: 42 });
    });

    it('flattens object nested inside array', () => {
        const input = { arr: [{ foo: 'bar' }] };
        const result = encodeAttributes(input);
        expect(result).toEqual({ arr: [{ foo: 'bar' }] });
    });

    it('handles array of arrays correctly', () => {
        const input = {
            matrix: [
                [1, 2],
                [3, 4]
            ]
        };
        const result = encodeAttributes(input);
        expect(result).toEqual({
            matrix: [
                [1, 2],
                [3, 4]
            ]
        });
    });

    it('drops functions inside arrays', () => {
        const input = { arr: [1, () => {}, 3] };
        const result = encodeAttributes(input);
        expect(result.arr).toEqual([1, 3]);
    });

    it('encodes nested Maps inside objects', () => {
        const map = new Map([['nested', new Map([['k', 'v']])]]);
        const result = encodeAttributes({ outer: map });
        expect(result.outer).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: 'nested',
                    value: expect.arrayContaining([
                        expect.objectContaining({ key: 'k', value: 'v' })
                    ])
                })
            ])
        );
    });

    it('handles deeply nested array of objects', () => {
        const input = { items: [[{ foo: 'bar' }]] };
        const result = encodeAttributes(input);
        expect(result.items).toEqual([[{ foo: 'bar' }]]);
    });

    it('handles objects with undefined values by dropping them', () => {
        const input = { a: 1, b: undefined, c: 'ok' };
        const result = encodeAttributes(input);
        expect(result).toEqual({ a: 1, c: 'ok' });
    });

    it('custom encoder can override primitive handling', () => {
        setEncoders([
            {
                check: (v: any): v is number => typeof v === 'number',
                encode: (n: number) => `num:${n}`
            }
        ]);
        const result = encodeAttributes({ a: 5 });
        expect(result).toEqual({ a: 'num:5' });
    });

    it('handles object with both dot syntax and nested keys without collisions', () => {
        const input = {
            'user.profile.name': 'Alice',
            user: { profile: { age: 30 } }
        };
        const result = encodeAttributes(input);
        expect(result).toEqual({
            'user.profile.name': 'Alice',
            'user.profile.age': 30
        });
    });

    it('handles null and undefined keys in Map', () => {
        const map = new Map<any, any>([
            [null, 'nullKey'],
            [undefined, 'undefinedKey']
        ]);
        const result = encodeAttributes({ myMap: map });
        expect(result.myMap).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ key: 'null', value: 'nullKey' }),
                expect.objectContaining({
                    key: 'undefined',
                    value: 'undefinedKey'
                })
            ])
        );
    });

    it('drops attributes after reaching the 128 limit and warns once', () => {
        // Prepare 200 simple attributes — max=128
        const input: Record<string, number> = {};
        for (let i = 0; i < 200; i++) {
            input[`key${i}`] = i;
        }

        const result = encodeAttributes(input);

        // Check that only 128 attributes remain
        expect(Object.keys(result)).toHaveLength(128);

        // Check the first ones are preserved
        expect(result).toHaveProperty('key0', 0);
        expect(result).toHaveProperty('key127', 127);

        // Check later ones were dropped
        expect(result).not.toHaveProperty('key128');

        // Check that a warning was shown at least once
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Attribute limit')
        );

        // Check there is only one "limit reached" warning (even if multiple attributes were dropped)
        const limitWarnings = (warn as jest.Mock).mock.calls.filter(([msg]) =>
            msg.includes('Attribute limit')
        );
        expect(limitWarnings).toHaveLength(1);
    });

    describe('internal SDK attributes (_dd. prefix)', () => {
        it('preserves nested structure of _dd. attributes without flattening', () => {
            const input = {
                '_dd.resource_timings': {
                    firstByte: { duration: 123, startTime: 456 },
                    download: { duration: 789, startTime: 101112 }
                },
                normalAttribute: 'value'
            };

            const result = encodeAttributes(input);

            // _dd. attribute should be preserved as-is
            expect(result['_dd.resource_timings']).toEqual({
                firstByte: { duration: 123, startTime: 456 },
                download: { duration: 789, startTime: 101112 }
            });

            // Normal attributes should still be flattened/encoded
            expect(result.normalAttribute).toBe('value');
        });

        it('preserves multiple _dd. attributes', () => {
            const input = {
                '_dd.graphql.operation_type': 'query',
                '_dd.graphql.operation_name': 'GetUser',
                '_dd.graphql.variables': '{}',
                '_dd.resource_timings': {
                    firstByte: { duration: 56845703 }
                },
                textAttribute: { nested: 'value' }
            };

            const result = encodeAttributes(input);

            // All _dd. attributes should be preserved as-is
            expect(result['_dd.graphql.operation_type']).toBe('query');
            expect(result['_dd.graphql.operation_name']).toBe('GetUser');
            expect(result['_dd.graphql.variables']).toBe('{}');
            expect(result['_dd.resource_timings']).toEqual({
                firstByte: { duration: 56845703 }
            });

            // Other attributes should still be flattened
            expect(result['textAttribute.nested']).toBe('value');
            expect(result.textAttribute).toBeUndefined();
        });

        it('does not flatten _dd. attributes even with deeply nested objects', () => {
            const input = {
                '_dd.custom': {
                    level1: {
                        level2: {
                            level3: {
                                value: 'deep'
                            }
                        }
                    }
                }
            };

            const result = encodeAttributes(input);

            // Should preserve the entire nested structure
            expect(result['_dd.custom']).toEqual({
                level1: {
                    level2: {
                        level3: {
                            value: 'deep'
                        }
                    }
                }
            });

            // Should NOT have flattened keys
            expect(
                result['_dd.custom.level1.level2.level3.value']
            ).toBeUndefined();
        });

        it('mixes _dd. attributes and other attributes correctly', () => {
            const input = {
                '_dd.span_id': '123',
                '_dd.trace_id': '456',
                user: {
                    name: 'John',
                    profile: {
                        age: 30
                    }
                }
            };

            const result = encodeAttributes(input);

            // _dd. attributes preserved
            expect(result['_dd.span_id']).toBe('123');
            expect(result['_dd.trace_id']).toBe('456');

            // Other attributes flattened
            expect(result['user.name']).toBe('John');
            expect(result['user.profile.age']).toBe(30);
            expect(result.user).toBeUndefined();
        });
    });

    // ------------------------------------------------------------------
    // RUMS-5828: 128 attribute cap drops legitimate payloads
    // ------------------------------------------------------------------
    //
    // These tests document the customer-expected behavior. They MUST fail
    // today because the SDK enforces MAX_ATTRIBUTES = 128 in helpers.ts.
    // They will pass once the cap is raised / removed / scoped to user
    // attributes only — at which point they become a regression contract
    // for the corrected behavior.
    //
    // Customer report: DdLogs.info(...) with a flat array of 22 small
    // objects (6 props each = 132 leaves) is silently truncated. From the
    // customer's perspective the cap mechanism IS the bug — these tests
    // assert what the customer reasonably expects.
    describe('RUMS-5828: 128 attribute cap drops legitimate payloads', () => {
        it('preserves all 132 leaves of the customer-reported nested-array payload', () => {
            // Customer minimal repro (Slack thread / Jira RUMS-5828):
            //   DdLogs.info('!!! test', { basicTestArray: [{a..f}] x 22 })
            // 22 items x 6 props = 132 flattened leaves.
            const basicTestArray = Array.from({ length: 22 }, () => ({
                a: 1,
                b: 2,
                c: 3,
                d: 4,
                e: 5,
                f: 6
            }));

            const result = encodeAttributes({ basicTestArray });

            // Customer expectation: the entire payload survives encoding.
            // The single top-level `basicTestArray` attribute should be
            // preserved with ALL 22 nested objects, each holding all 6
            // properties. None of `a..f` should be dropped on any item.
            expect(result.basicTestArray).toBeDefined();
            expect(Array.isArray(result.basicTestArray)).toBe(true);
            expect((result.basicTestArray as unknown[]).length).toBe(22);
            for (let i = 0; i < 22; i++) {
                expect((result.basicTestArray as any)[i]).toEqual({
                    a: 1,
                    b: 2,
                    c: 3,
                    d: 4,
                    e: 5,
                    f: 6
                });
            }

            // No "Attribute limit" warning should fire for this payload —
            // it represents a normal analytics event, not abusive input.
            const limitWarnings = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' && msg.includes('Attribute limit')
            );
            expect(limitWarnings).toHaveLength(0);
        });

        it('preserves a flat 129-key input without dropping any attribute', () => {
            // Boundary documentation: a flat input one over the current
            // cap (129) should still be preserved end-to-end. Today the
            // cap silently drops the 129th key (k128). When the cap is
            // raised to 256 (or removed), this expectation holds.
            const input: Record<string, number> = {};
            for (let i = 0; i < 129; i++) {
                input[`k${i}`] = i;
            }

            const result = encodeAttributes(input);

            expect(Object.keys(result)).toHaveLength(129);
            expect(result.k128).toBe(128);

            const limitWarnings = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' && msg.includes('Attribute limit')
            );
            expect(limitWarnings).toHaveLength(0);
        });

        it('does not let internal _dd.* attributes consume the user-attribute budget', () => {
            // attributesEncoding.ts:35 increments numOfAttributes on the
            // _dd.* shortcut path, which means SDK-internal metadata
            // shrinks the headroom for user attributes. Customer
            // expectation: SDK-internal metadata is overhead the SDK
            // controls, not part of the user's attribute budget.
            const input: Record<string, unknown> = { '_dd.foo': 'bar' };
            for (let i = 0; i < 128; i++) {
                input[`k${i}`] = i;
            }

            const result = encodeAttributes(input);

            // All 128 user attributes preserved, plus the _dd.foo metadata.
            expect(result['_dd.foo']).toBe('bar');
            for (let i = 0; i < 128; i++) {
                expect(result[`k${i}`]).toBe(i);
            }
            expect(Object.keys(result)).toHaveLength(129);

            const limitWarnings = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' && msg.includes('Attribute limit')
            );
            expect(limitWarnings).toHaveLength(0);
        });
    });

    // ------------------------------------------------------------------
    // RUMS-5828: current behavior pin (regression contract)
    // ------------------------------------------------------------------
    //
    // These tests document the EXACT present-day buggy behavior so that
    // any future change to the cap mechanism is intentional, not
    // incidental. They pass today against MAX_ATTRIBUTES = 128 and SHOULD
    // be deleted (or updated) at the same time as the fix that removes
    // / raises / re-scopes the cap. They are paired with the failing
    // tests above so reviewers can see both sides of the contract.
    describe('RUMS-5828: current behavior pin (regression contract)', () => {
        it('CURRENT BEHAVIOR: drops the entire basicTestArray for the 132-leaf customer payload', () => {
            // Pins the present-day cascade where each of the 22 nested
            // objects increments numOfAttributes via addEncodedAttribute,
            // overflowing the 128 cap before the array wrapper itself
            // can be written. Net effect: result is empty {}.
            const basicTestArray = Array.from({ length: 22 }, () => ({
                a: 1,
                b: 2,
                c: 3,
                d: 4,
                e: 5,
                f: 6
            }));

            const result = encodeAttributes({ basicTestArray });

            // The cap is hit before the outer array attribute is written,
            // so even basicTestArray itself is dropped.
            expect(Object.keys(result)).toHaveLength(0);
            expect(result.basicTestArray).toBeUndefined();

            // One aggregate "limit reached" warn + one warn for the
            // outer basicTestArray drop + four inner-prop drop warns
            // (path 'c', 'd', 'e', 'f' from item index 21 — recursion
            // into a nested object uses an empty base path, so the
            // dropped inner-prop warns reference single-segment keys).
            const limitReachedWarns = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' &&
                    msg.startsWith('Attribute limit of 128 reached')
            );
            expect(limitReachedWarns).toHaveLength(1);

            const droppedAttrWarns = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' &&
                    msg.startsWith('Dropped attribute at')
            );
            expect(droppedAttrWarns).toHaveLength(5);

            // basicTestArray wrapper itself is dropped.
            expect(
                droppedAttrWarns.some(([msg]: [string]) =>
                    msg.includes("'basicTestArray'")
                )
            ).toBe(true);
            // Inner-prop drops (last 4 props of the 22nd item).
            for (const k of ['c', 'd', 'e', 'f']) {
                expect(
                    droppedAttrWarns.some(([msg]: [string]) =>
                        msg.includes(`'${k}'`)
                    )
                ).toBe(true);
            }
        });

        it('CURRENT BEHAVIOR: a flat 128-key input passes unchanged with no warnings', () => {
            const input: Record<string, number> = {};
            for (let i = 0; i < 128; i++) {
                input[`k${i}`] = i;
            }

            const result = encodeAttributes(input);

            expect(Object.keys(result)).toHaveLength(128);
            expect(result.k0).toBe(0);
            expect(result.k127).toBe(127);
            expect(warn).not.toHaveBeenCalled();
        });

        it('CURRENT BEHAVIOR: a flat 129-key input is capped at 128 with one limit warn and one drop warn', () => {
            const input: Record<string, number> = {};
            for (let i = 0; i < 129; i++) {
                input[`k${i}`] = i;
            }

            const result = encodeAttributes(input);

            expect(Object.keys(result)).toHaveLength(128);
            expect(result.k127).toBe(127);
            expect(result.k128).toBeUndefined();

            const limitReachedWarns = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' &&
                    msg.startsWith('Attribute limit of 128 reached')
            );
            expect(limitReachedWarns).toHaveLength(1);

            const droppedAttrWarns = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' &&
                    msg.startsWith('Dropped attribute at')
            );
            expect(droppedAttrWarns).toHaveLength(1);
            expect(droppedAttrWarns[0][0]).toContain("'k128'");
        });

        it('CURRENT BEHAVIOR: _dd.* attributes consume one slot of the 128-attribute budget', () => {
            // Pins the attributesEncoding.ts:35 increment on the _dd.*
            // shortcut path — adding one _dd.* attribute drops one user
            // attribute when the user side has 128 keys.
            const input: Record<string, unknown> = { '_dd.foo': 'bar' };
            for (let i = 0; i < 128; i++) {
                input[`k${i}`] = i;
            }

            const result = encodeAttributes(input);

            expect(Object.keys(result)).toHaveLength(128);
            expect(result['_dd.foo']).toBe('bar');
            // 127 user attributes preserved, last one (k127) dropped.
            expect(result.k126).toBe(126);
            expect(result.k127).toBeUndefined();

            const limitReachedWarns = (warn as jest.Mock).mock.calls.filter(
                ([msg]: [string]) =>
                    typeof msg === 'string' &&
                    msg.startsWith('Attribute limit of 128 reached')
            );
            expect(limitReachedWarns).toHaveLength(1);
        });
    });
});
