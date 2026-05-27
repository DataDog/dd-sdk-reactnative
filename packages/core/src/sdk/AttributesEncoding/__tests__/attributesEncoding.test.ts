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

    it('does not modify original object when encoding many attributes', () => {
        const input: Record<string, string> = {};
        for (let i = 0; i < 200; i++) {
            input[`k${i}`] = `v${i}`;
        }
        const snapshot = { ...input };

        const result = encodeAttributes(input);
        expect(Object.keys(result)).toHaveLength(200);
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

    it('warns once when the 256 attribute limit is exceeded, but does not drop attributes', () => {
        // Prepare 300 simple attributes — exceeds max=256
        const input: Record<string, number> = {};
        for (let i = 0; i < 300; i++) {
            input[`key${i}`] = i;
        }

        const result = encodeAttributes(input);

        // All 300 attributes are preserved — no hard cap
        expect(Object.keys(result)).toHaveLength(300);

        // All attributes are present
        expect(result).toHaveProperty('key0', 0);
        expect(result).toHaveProperty('key255', 255);
        expect(result).toHaveProperty('key256', 256);
        expect(result).toHaveProperty('key299', 299);

        // A single warning is emitted when the limit is exceeded
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Attribute limit')
        );

        // Exactly one "limit exceeded" warning (not one per extra attribute)
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
});
