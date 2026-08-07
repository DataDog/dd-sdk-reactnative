/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { __ddEnrichEvaluationContextWithRumUser } from '@datadog/mobile-react-native';

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
        configurationFromString: jest.fn(),
        __ddEnrichEvaluationContextWithRumUser: jest.fn(context => context)
    };
});

const mockEnrichEvaluationContextWithRumUser = jest.mocked(
    __ddEnrichEvaluationContextWithRumUser
);

describe('DatadogOpenFeatureProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEnrichEvaluationContextWithRumUser.mockImplementation(
            context => context
        );
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

    it('enriches the initial OpenFeature context before fetching', async () => {
        mockEnrichEvaluationContextWithRumUser.mockReturnValueOnce({
            targetingKey: 'rum-user',
            email: 'rum@example.com'
        });
        const provider = new DatadogOpenFeatureProvider();

        await provider.initialize({});

        expect(mockEnrichEvaluationContextWithRumUser).toHaveBeenCalledWith({});
        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith({
            targetingKey: 'rum-user',
            attributes: { email: 'rum@example.com' }
        });
    });

    it('fetches on a context change', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' })
        );
    });

    it('reads the latest RUM user on each context change', async () => {
        mockEnrichEvaluationContextWithRumUser.mockReturnValueOnce({
            targetingKey: 'rum-user-b',
            plan: 'pro'
        });
        const provider = new DatadogOpenFeatureProvider();

        await provider.onContextChange({}, {});

        expect(mockEnrichEvaluationContextWithRumUser).toHaveBeenCalledWith({});
        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith({
            targetingKey: 'rum-user-b',
            attributes: { plan: 'pro' }
        });
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
