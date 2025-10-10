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
});
