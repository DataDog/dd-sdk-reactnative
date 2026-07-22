/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogOpenFeatureProvider } from '../provider';

const mockFlagsClient = {
    setEvaluationContext: jest.fn(() => Promise.resolve()),
    setEvaluationContextWithoutFetching: jest.fn(() => 'ready'),
    getBooleanDetails: jest.fn(() => ({
        key: 'flag',
        value: true,
        reason: 'STATIC',
        variant: 'true'
    }))
};

jest.mock('@datadog/mobile-react-native', () => {
    return {
        DdFlags: { getClient: jest.fn(() => mockFlagsClient) },
        configurationFromString: jest.fn()
    };
});

describe('DatadogOpenFeatureProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('advertises the online provider name', () => {
        expect(new DatadogOpenFeatureProvider().metadata.name).toBe(
            'datadog-react-native'
        );
    });

    it('fetches on initialize (uses the fetching setEvaluationContext)', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.initialize({ targetingKey: 'user-1' });

        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-1' })
        );
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('fetches on a context change', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' })
        );
    });

    it('resolves boolean evaluation through the client', () => {
        const provider = new DatadogOpenFeatureProvider();

        const result = provider.resolveBooleanEvaluation(
            'flag',
            false,
            {},
            // eslint-disable-next-line no-console
            console as never
        );

        expect(result.value).toBe(true);
    });
});
