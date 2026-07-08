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

        expect(cache.bool).toEqual({
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
        expect(cache.str.value).toBe('hello');
        expect(cache.str.variationValue).toBe('hello');
        expect(cache.num.value).toBe(42);
        expect(cache.num.variationValue).toBe('42');
        // integer/float keep their wire variationType but decode to a JS number.
        expect(cache.int.value).toBe(7);
        expect(cache.int.variationType).toBe('integer');
        expect(cache.int.variationValue).toBe('7');
        expect(cache.flt.value).toBe(1.5);
        expect(cache.flt.variationType).toBe('float');
        expect(cache.flt.variationValue).toBe('1.5');
        // objects are JSON-encoded for the string form; value stays an object.
        expect(cache.obj.value).toEqual({ greeting: 'hi' });
        expect(cache.obj.variationValue).toBe('{"greeting":"hi"}');
    });

    it('uses the flag map key as the entry key', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ 'my-feature': flag({}) })
        );

        expect(cache['my-feature'].key).toBe('my-feature');
    });

    it('defaults missing extraLogging to an empty object', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ f: flag({ extraLogging: undefined }) })
        );

        expect(cache.f.extraLogging).toEqual({});
    });

    it('tolerates a null serialId', () => {
        const cache = decodePrecomputedFlags(
            responseWith({ f: flag({ serialId: null }) })
        );

        expect(cache.f.key).toBe('f');
    });

    it('omits flags with an unsupported variation type and logs a warning', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                good: flag({}),
                bad: flag({ variationType: 'timestamp' })
            })
        );

        expect(cache.good).toBeDefined();
        expect(cache.bad).toBeUndefined();
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

        expect(cache.mismatched).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a non-object flag entry and keeps the valid ones', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                good: flag({}),
                bad: (null as unknown) as PrecomputedFlag
            })
        );

        expect(cache.good).toBeDefined();
        expect(cache.bad).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a flag with malformed metadata field types', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                badReason: flag({ reason: (42 as unknown) as string }),
                badDoLog: flag({ doLog: ('yes' as unknown) as boolean })
            })
        );

        expect(cache.badReason).toBeUndefined();
        expect(cache.badDoLog).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('throws UnsupportedConfigurationError for an obfuscated response', () => {
        expect(() =>
            decodePrecomputedFlags(responseWith({ f: flag({}) }, true))
        ).toThrow(UnsupportedConfigurationError);
    });

    it('returns an empty map when there are no flags', () => {
        expect(decodePrecomputedFlags(responseWith({}))).toEqual({});
    });

    it('omits an integer flag with a fractional value', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                frac: flag({ variationType: 'integer', variationValue: 7.9 })
            })
        );

        expect(cache.frac).toBeUndefined();
        expect(InternalLog.log).toHaveBeenCalled();
    });

    it('omits a number flag whose value is not finite', () => {
        const cache = decodePrecomputedFlags(
            responseWith({
                inf: flag({ variationType: 'number', variationValue: Infinity })
            })
        );

        expect(cache.inf).toBeUndefined();
    });

    it('returns an empty map for a structurally broken response', () => {
        expect(
            decodePrecomputedFlags(
                ({} as unknown) as Parameters<typeof decodePrecomputedFlags>[0]
            )
        ).toEqual({});
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

        expect(cache.arr.value).toEqual([1, 2, 3]);
        expect(cache.arr.variationValue).toBe('[1,2,3]');
        expect(cache.nul.value).toBeNull();
        expect(cache.nul.variationValue).toBe('null');
        expect(cache.str.value).toBe('hi');
        expect(cache.str.variationValue).toBe('hi');
    });

    it('stores a flag keyed "__proto__" as data without polluting the prototype', () => {
        // Computed key mirrors how JSON.parse yields an own "__proto__" property.
        const cache = decodePrecomputedFlags(
            responseWith({ ['__proto__']: flag({ variationValue: true }) })
        );

        // Stored as an own data property, not via the Object.prototype setter.
        expect(Object.getPrototypeOf(cache)).toBe(Object.prototype);
        expect(Object.keys(cache)).toContain('__proto__');
        // No global prototype pollution.
        expect(({} as Record<string, unknown>).variationType).toBeUndefined();
    });
});
