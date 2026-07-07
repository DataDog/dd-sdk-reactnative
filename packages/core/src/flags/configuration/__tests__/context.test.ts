/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EvaluationContext } from '../../types';
import { contextMatchesConfiguration, normalizeWireContext } from '../context';

jest.mock('../../../InternalLog', () => {
    return {
        InternalLog: { log: jest.fn() },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('normalizeWireContext', () => {
    it('maps a flat wire context to { targetingKey, attributes }', () => {
        expect(
            normalizeWireContext({
                targetingKey: 'user-1',
                country: 'US',
                age: 25
            })
        ).toEqual({
            targetingKey: 'user-1',
            attributes: { country: 'US', age: 25 }
        });
    });

    it('defaults a missing targeting key to an empty string', () => {
        expect(normalizeWireContext({ country: 'US' })).toEqual({
            targetingKey: '',
            attributes: { country: 'US' }
        });
    });

    it('drops non-primitive attributes', () => {
        expect(
            normalizeWireContext({
                targetingKey: 'user-1',
                country: 'US',
                nested: { a: 1 }
            })
        ).toEqual({ targetingKey: 'user-1', attributes: { country: 'US' } });
    });
});

describe('contextMatchesConfiguration', () => {
    const active: EvaluationContext = {
        targetingKey: 'user-1',
        attributes: { country: 'US' }
    };

    it('matches any context when the config has no embedded context', () => {
        expect(contextMatchesConfiguration(undefined, active)).toBe(true);
    });

    it('matches an equal context', () => {
        expect(
            contextMatchesConfiguration(
                { targetingKey: 'user-1', country: 'US' },
                active
            )
        ).toBe(true);
    });

    it('does not match a different targeting key', () => {
        expect(
            contextMatchesConfiguration(
                { targetingKey: 'user-2', country: 'US' },
                active
            )
        ).toBe(false);
    });

    it('does not match a different attribute value', () => {
        expect(
            contextMatchesConfiguration(
                { targetingKey: 'user-1', country: 'CA' },
                active
            )
        ).toBe(false);
    });

    it('does not match when the wire has an extra primitive attribute', () => {
        expect(
            contextMatchesConfiguration(
                { targetingKey: 'user-1', country: 'US', plan: 'pro' },
                active
            )
        ).toBe(false);
    });

    it('ignores dropped non-primitive attributes on both sides', () => {
        // The nested attribute is dropped by the same normalization applied to the
        // active context, so a wire context that only differs by it still matches.
        expect(
            contextMatchesConfiguration(
                { targetingKey: 'user-1', country: 'US', nested: { a: 1 } },
                active
            )
        ).toBe(true);
    });
});
