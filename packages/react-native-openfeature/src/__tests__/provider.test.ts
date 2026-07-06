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
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
    },
    'flag-no-alloc': {
        key: 'flag-no-alloc',
        value: 'hello',
        allocationKey: null,
        variationKey: 'hello',
        reason: 'STATIC',
        doLog: true,
        // Internal fields for Android.
        variationType: '',
        variationValue: '',
        extraLogging: {}
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
        it('should include allocationKey in flagMetadata when present', () => {
            const result = provider.resolveBooleanEvaluation(
                'bool-flag',
                false,
                {},
                {} as any
            );

            expect(result.flagMetadata).toEqual({
                allocationKey: 'alloc-xyz'
            });
        });

        it('should return undefined flagMetadata when allocationKey is null', () => {
            const result = provider.resolveStringEvaluation(
                'flag-no-alloc',
                'default',
                {},
                {} as any
            );

            expect(result.flagMetadata).toBeUndefined();
        });
    });
});
