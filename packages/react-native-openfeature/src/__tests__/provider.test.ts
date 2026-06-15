/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags } from '@datadog/mobile-react-native';
import { NativeModules } from 'react-native';

import { DatadogOpenFeatureProvider } from '../provider';

jest.spyOn(NativeModules.DdFlags, 'setEvaluationContext').mockResolvedValue({
    'bool-flag': {
        key: 'bool-flag',
        value: true,
        allocationKey: 'alloc-xyz',
        variationKey: 'true',
        reason: 'TARGETED',
        doLog: true,
        variationType: '',
        variationValue: '',
        extraLogging: {
            campaignId: 'camp-999',
            score: 7,
            eligible: false,
            ignored: { nested: true }
        }
    },
    'flag-no-alloc': {
        key: 'flag-no-alloc',
        value: 'hello',
        allocationKey: '',
        variationKey: 'hello',
        reason: 'STATIC',
        doLog: true,
        variationType: '',
        variationValue: '',
        extraLogging: {
            source: 'experiment-a'
        }
    },
    'flag-alloc-key-collision': {
        key: 'flag-alloc-key-collision',
        value: true,
        allocationKey: 'real-alloc',
        variationKey: 'true',
        reason: 'TARGETED',
        doLog: true,
        variationType: '',
        variationValue: '',
        extraLogging: {
            allocationKey: 'impostor-alloc',
            label: 'test'
        }
    },
    'flag-empty-extra-logging': {
        key: 'flag-empty-extra-logging',
        value: 42,
        allocationKey: '',
        variationKey: '42',
        reason: 'STATIC',
        doLog: true,
        variationType: '',
        variationValue: '',
        extraLogging: {}
    },
    'flag-null-only-extra-logging': {
        key: 'flag-null-only-extra-logging',
        value: 42,
        allocationKey: '',
        variationKey: '42',
        reason: 'STATIC',
        doLog: true,
        variationType: '',
        variationValue: '',
        extraLogging: {
            nullField: null
        }
    }
});

describe('DatadogOpenFeatureProvider', () => {
    let provider: DatadogOpenFeatureProvider;

    beforeEach(async () => {
        jest.clearAllMocks();

        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });

        await DdFlags.enable();

        provider = new DatadogOpenFeatureProvider();
        await provider.initialize({ targetingKey: 'user-1' });
    });

    describe('toFlagResolution / flagMetadata', () => {
        it('should include extraLogging primitives in flagMetadata', () => {
            const result = provider.resolveBooleanEvaluation(
                'bool-flag',
                false,
                {},
                {} as any
            );

            expect(result.flagMetadata).toEqual({
                campaignId: 'camp-999',
                score: 7,
                eligible: false,
                allocationKey: 'alloc-xyz'
            });
            // Non-primitive 'ignored' key should NOT appear
            expect(result.flagMetadata).not.toHaveProperty('ignored');
        });

        it('should include extraLogging in flagMetadata when there is no allocationKey', () => {
            const result = provider.resolveStringEvaluation(
                'flag-no-alloc',
                'default',
                {},
                {} as any
            );

            expect(result.flagMetadata).toEqual({
                source: 'experiment-a'
            });
        });

        it('should use the typed allocationKey field, not the allocationKey key from extraLogging', () => {
            const result = provider.resolveBooleanEvaluation(
                'flag-alloc-key-collision',
                false,
                {},
                {} as any
            );

            // The typed allocationKey wins; extraLogging's 'allocationKey' is excluded
            expect(result.flagMetadata?.allocationKey).toBe('real-alloc');
            expect(result.flagMetadata).toEqual({
                label: 'test',
                allocationKey: 'real-alloc'
            });
        });

        it('should return undefined flagMetadata when extraLogging is empty and allocationKey is absent', () => {
            const result = provider.resolveNumberEvaluation(
                'flag-empty-extra-logging',
                0,
                {},
                {} as any
            );

            expect(result.flagMetadata).toBeUndefined();
        });

        it('should return undefined flagMetadata when extraLogging has only null values and allocationKey is absent', () => {
            const result = provider.resolveNumberEvaluation(
                'flag-null-only-extra-logging',
                0,
                {},
                {} as any
            );

            expect(result.flagMetadata).toBeUndefined();
        });
    });
});
