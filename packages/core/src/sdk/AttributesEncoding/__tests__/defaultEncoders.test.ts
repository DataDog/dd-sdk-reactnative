/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    stringEncoder,
    numberEncoder,
    booleanEncoder,
    nullishEncoder,
    arrayEncoder,
    dateEncoder,
    errorEncoder,
    mapEncoder
} from '../defaultEncoders';
import { warn } from '../utils';

jest.mock('../utils', () => ({
    ...jest.requireActual('../utils'),
    warn: jest.fn()
}));

describe('default encoders', () => {
    beforeEach(() => {
        (warn as jest.Mock).mockClear();
    });

    describe('stringEncoder', () => {
        it('encodes a string directly', () => {
            expect(stringEncoder.check('foo')).toBe(true);
            expect(stringEncoder.encode('foo')).toBe('foo');
        });
        it('rejects non-strings', () => {
            expect(stringEncoder.check(123)).toBe(false);
        });
    });

    describe('numberEncoder', () => {
        it('encodes finite numbers', () => {
            expect(numberEncoder.check(42)).toBe(true);
            expect(numberEncoder.encode(42)).toBe(42);
        });
        it('drops NaN and Infinity', () => {
            expect(numberEncoder.encode(NaN)).toBeUndefined();
            expect(numberEncoder.encode(Infinity)).toBeUndefined();
        });
    });

    describe('booleanEncoder', () => {
        it('encodes booleans directly', () => {
            expect(booleanEncoder.check(true)).toBe(true);
            expect(booleanEncoder.encode(true)).toBe(true);
            expect(booleanEncoder.encode(false)).toBe(false);
        });
    });

    describe('nullishEncoder', () => {
        it('encodes null and undefined directly', () => {
            expect(nullishEncoder.check(null)).toBe(true);
            expect(nullishEncoder.check(undefined)).toBe(true);
            expect(nullishEncoder.encode(null)).toBeNull();
            expect(nullishEncoder.encode(undefined)).toBeUndefined();
        });
        it('rejects non-nullish values', () => {
            expect(nullishEncoder.check('')).toBe(false);
        });
    });

    describe('arrayEncoder', () => {
        it('encodes array of primitives', () => {
            const result = arrayEncoder.encode([1, 'a', true]);
            expect(result).toEqual([1, 'a', true]);
        });
        it('encodes nested objects inside array', () => {
            const result = arrayEncoder.encode([{ foo: 'bar' }]);
            expect((result as Record<string, string>[])[0]).toHaveProperty(
                'foo',
                'bar'
            );
        });
        it('encodes nested arrays recursively', () => {
            const result = arrayEncoder.encode([[1, 2], ['a']]);
            expect(result).toEqual([[1, 2], ['a']]);
        });
    });

    describe('dateEncoder', () => {
        it('encodes Date to string', () => {
            const date = new Date('2020-01-01T00:00:00Z');
            expect(dateEncoder.check(date)).toBe(true);
            expect(dateEncoder.encode(date)).toEqual(String(date));
        });
        it('rejects non-Date values', () => {
            expect(dateEncoder.check('2020-01-01')).toBe(false);
        });
    });

    describe('errorEncoder', () => {
        it('encodes Error with name, message, and stack', () => {
            const error = new Error('boom');
            const result = errorEncoder.encode(error) as Record<string, string>;
            expect(result.name).toBe('Error');
            expect(result.message).toBe('boom');
            expect(result.stack).toContain('Error: boom');
        });

        it('removes duplicate fields like stack', () => {
            const err = {
                message: 'fail'
            } as Record<string, any>;

            err.name = 'CustomError';
            err.stacktrace = 'custom-stack';
            err.stack = 'error-stacktrace';
            err.componentStack = 'component-stack';

            const result = errorEncoder.encode(err) as Record<string, string>;
            expect(result.name).toBe('CustomError');
            expect(result.message).toBe('fail');
            expect(result.stack).toBe('custom-stack');
            expect(result).not.toHaveProperty('stacktrace');
            expect(result).toHaveProperty('componentStack');
        });

        it('does not cause infinite recursion', () => {
            const error = new Error('stack overflow test');
            errorEncoder.encode(error);
            expect(warn).not.toHaveBeenCalledWith(
                expect.stringContaining('Encoder error')
            );
        });

        it('does not cause infinite recursion with nested Error cause', () => {
            const inner = new Error('inner');
            const outer: any = new Error('outer');
            outer.cause = inner;
            errorEncoder.encode(outer);
            expect(warn).not.toHaveBeenCalledWith(
                expect.stringContaining('Encoder error')
            );
        });

        it('encodes error with cause', () => {
            const cause = new Error('inner');
            const err: any = new Error('outer');
            err.cause = cause;
            const result = errorEncoder.encode(err) as Record<string, any>;
            expect(result.cause).toEqual(
                expect.objectContaining({
                    name: 'Error',
                    message: 'inner'
                })
            );
            expect(result.cause.stack).toContain('Error: inner');
        });
    });

    describe('mapEncoder', () => {
        it('encodes map with string keys', () => {
            const map = new Map<string, any>([
                ['a', 1],
                ['b', 'str']
            ]);
            const result = mapEncoder.encode(map);
            expect(result).toEqual(
                expect.arrayContaining([
                    { key: 'a', keyType: 'string', value: 1 },
                    { key: 'b', keyType: 'string', value: 'str' }
                ])
            );
        });

        it('encodes map with object key', () => {
            const keyObj = { toString: () => 'objKey' };
            const map = new Map<any, any>([[keyObj, 123]]);
            const result = mapEncoder.encode(map);
            expect((result as Record<string, any>[])[0]).toHaveProperty(
                'key',
                'objKey'
            );
            expect((result as Record<string, any>[])[0]).toHaveProperty(
                'keyType',
                'object'
            );
        });

        it('encodes map with symbol key', () => {
            const map = new Map<any, any>([[Symbol('s'), 'val']]);
            const result = mapEncoder.encode(map);
            expect((result as Record<string, any>[])[0].key).toContain(
                'Symbol(s)'
            );
            expect((result as Record<string, any>[])[0].keyType).toBe('symbol');
        });

        it('encodes map with null and undefined keys', () => {
            const map = new Map<any, any>([
                [null, 'nullVal'],
                [undefined, 'undefVal']
            ]);
            const result = mapEncoder.encode(map);
            expect(result).toEqual(
                expect.arrayContaining([
                    { key: 'null', keyType: 'object', value: 'nullVal' },
                    {
                        key: 'undefined',
                        keyType: 'undefined',
                        value: 'undefVal'
                    }
                ])
            );
        });

        it('warns and drops unsupported key types', () => {
            const map = new Map<any, any>([[BigInt(1), 'big']]);
            const result = mapEncoder.encode(map);
            expect((result as Record<string, any>[])[0].key).toBe('1'); // bigint stringified
            expect(warn).not.toHaveBeenCalled(); // bigint is allowed
        });
    });
});
