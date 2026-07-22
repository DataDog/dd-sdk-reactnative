/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../InternalLog';
import {
    UnsupportedConfigurationError,
    decodePrecomputedFlags
} from '../precomputed';
import type {
    PrecomputedConfigurationResponse,
    PrecomputedFlag
} from '../types';

jest.mock('../../../InternalLog', () => {
    return {
        InternalLog: { log: jest.fn() },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

const flag = (overrides: Partial<PrecomputedFlag>): PrecomputedFlag => ({
    variationType: 'boolean',
    variationValue: true,
    variationKey: 'true',
    allocationKey: 'alloc-1',
    reason: 'STATIC',
    doLog: false,
    extraLogging: {},
    ...overrides
});

const responseWith = (
    flags: Record<string, PrecomputedFlag>,
    obfuscated = false
): PrecomputedConfigurationResponse => ({
    data: {
        id: '2',
        type: 'precomputed-assignments',
        attributes: {
            obfuscated,
            createdAt: '2026-07-06T23:01:56.822171460Z',
            format: 'PRECOMPUTED',
            environment: { name: 'Staging' },
            flags
        }
    }
});

describe('decodePrecomputedFlags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('maps each variation type to a FlagCacheEntry with the correct value + string form', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                bool: flag({
                    variationType: 'boolean',
                    variationValue: false,
                    variationKey: 'false'
                }),
                str: flag({
                    variationType: 'string',
                    variationValue: 'hello',
                    variationKey: 'Hello'
                }),
                num: flag({
                    variationType: 'number',
                    variationValue: 42,
                    variationKey: '42'
                }),
                int: flag({
                    variationType: 'integer',
                    variationValue: 7,
                    variationKey: '7'
                }),
                flt: flag({
                    variationType: 'float',
                    variationValue: 1.5,
                    variationKey: '1.5'
                }),
                obj: flag({
                    variationType: 'object',
                    variationValue: { greeting: 'hi' },
                    variationKey: 'Greeting'
                })
            })
        );

        expect(cache.get('bool')).toEqual({
            key: 'bool',
            value: false,
            allocationKey: 'alloc-1',
            variationKey: 'false',
            variationType: 'boolean',
            variationValue: 'false',
            reason: 'STATIC',
            doLog: false,
            extraLogging: {}
        });
        expect(cache.get('str')?.value).toBe('hello');
        expect(cache.get('str')?.variationValue).toBe('hello');
        expect(cache.get('num')?.value).toBe(42);
        expect(cache.get('num')?.variationValue).toBe('42');
        // integer/float keep their wire variationType but decode to a JS number.
        expect(cache.get('int')?.value).toBe(7);
        expect(cache.get('int')?.variationType).toBe('integer');
        expect(cache.get('int')?.variationValue).toBe('7');
        expect(cache.get('flt')?.value).toBe(1.5);
        expect(cache.get('flt')?.variationType).toBe('float');
        expect(cache.get('flt')?.variationValue).toBe('1.5');
        // objects are JSON-encoded for the string form; value stays an object.
        expect(cache.get('obj')?.value).toEqual({ greeting: 'hi' });
        expect(cache.get('obj')?.variationValue).toBe('{"greeting":"hi"}');
    });

    it('uses the flag map key as the entry key', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ 'my-feature': flag({}) })
        );

        expect(cache.get('my-feature')?.key).toBe('my-feature');
    });

    it('defaults missing extraLogging to an empty object', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ f: flag({ extraLogging: undefined }) })
        );

        expect(cache.get('f')?.extraLogging).toEqual({});
    });

    it('tolerates a null serialId', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ f: flag({ serialId: null }) })
        );

        expect(cache.get('f')?.key).toBe('f');
    });

    it('omits flags with an unsupported variation type and logs a warning', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                good: flag({}),
                bad: flag({ variationType: 'timestamp' })
            })
        );

        expect(cache.get('good')).toBeDefined();
        expect(cache.get('bad')).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits flags whose value does not match their variation type', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                mismatched: flag({
                    variationType: 'number',
                    variationValue: 'not-a-number'
                })
            })
        );

        expect(cache.get('mismatched')).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a non-object flag entry and keeps the valid ones', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                good: flag({}),
                bad: (null as unknown) as PrecomputedFlag
            })
        );

        expect(cache.get('good')).toBeDefined();
        expect(cache.get('bad')).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a flag with malformed metadata field types', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                badReason: flag({ reason: (42 as unknown) as string }),
                badDoLog: flag({ doLog: ('yes' as unknown) as boolean })
            })
        );

        expect(cache.get('badReason')).toBeUndefined();
        expect(cache.get('badDoLog')).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('throws UnsupportedConfigurationError for an obfuscated response', () => {
        expect(() =>
            decodePrecomputedFlags(responseWith({ f: flag({}) }, true))
        ).toThrow(UnsupportedConfigurationError);
    });

    it('returns an empty map when there are no flags', () => {
        expect(decodePrecomputedFlags(responseWith({})).size).toBe(0);
    });

    it('omits an integer flag with a fractional value', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                frac: flag({ variationType: 'integer', variationValue: 7.9 })
            })
        );

        expect(cache.get('frac')).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a number flag whose value is not finite', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                inf: flag({ variationType: 'number', variationValue: Infinity })
            })
        );

        expect(cache.get('inf')).toBeUndefined();
    });

    it.each([
        ['a null response', null],
        ['a non-object response', 'nonsense'],
        ['a missing data envelope', {}],
        ['a missing attributes envelope', { data: {} }],
        ['a missing flags map', { data: { attributes: {} } }],
        ['a null flags map', { data: { attributes: { flags: null } } }],
        ['an array flags map', { data: { attributes: { flags: [] } } }]
    ])('throws for a structurally malformed response (%s)', (_label, input) => {
        expect(() =>
            decodePrecomputedFlags(
                (input as unknown) as Parameters<
                    typeof decodePrecomputedFlags
                >[0]
            )
        ).toThrow(UnsupportedConfigurationError);
    });

    it('accepts any JSON value for an object flag (array, null, primitive)', () => {
        // ffe-service enforces a top-level object at the API layer, but that is not a
        // storage constraint, so the decoder accepts whatever JSON arrives here.
        const cache = decodePrecomputedFlags(
            responseWith({
                arr: flag({
                    variationType: 'object',
                    variationValue: [1, 2, 3]
                }),
                nul: flag({
                    variationType: 'object',
                    variationValue: null
                }),
                str: flag({
                    variationType: 'object',
                    variationValue: 'hi'
                })
            })
        );

        expect(cache.get('arr')?.value).toEqual([1, 2, 3]);
        expect(cache.get('arr')?.variationValue).toBe('[1,2,3]');
        expect(cache.get('nul')?.value).toBeNull();
        expect(cache.get('nul')?.variationValue).toBe('null');
        expect(cache.get('str')?.value).toBe('hi');
        expect(cache.get('str')?.variationValue).toBe('hi');
    });

    it('stores a flag keyed "__proto__" as data without polluting the prototype', () => {
        // Computed key mirrors how JSON.parse yields an own "__proto__" property.
        const cache = decodePrecomputedFlags(
            responseWith({ ['__proto__']: flag({ variationValue: true }) })
        );

        // A Map stores "__proto__" as an ordinary key, retrievable via .get(), and never
        // touches Object.prototype.
        expect(cache.get('__proto__')?.value).toBe(true);
        // No global prototype pollution.
        expect(({} as Record<string, unknown>).variationType).toBeUndefined();
    });
});
