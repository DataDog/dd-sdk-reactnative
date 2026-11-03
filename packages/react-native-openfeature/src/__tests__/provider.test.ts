/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { EvaluationContext } from '@openfeature/web-sdk';

import { DatadogOpenFeatureProvider } from '../provider';

const mockFlagsClient = {
    __ddSetEvaluationContext: jest.fn(() => Promise.resolve()),
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

    it('fetches on initialize (uses the fetching __ddSetEvaluationContext)', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.initialize({ targetingKey: 'user-1' });

        expect(mockFlagsClient.__ddSetEvaluationContext).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-1' }),
            true
        );
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('fetches on a context change', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(mockFlagsClient.__ddSetEvaluationContext).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' }),
            true
        );
    });

    it.each([
        { context: { country: 'US' }, hasTargetingKey: false },
        {
            context: { targetingKey: undefined, country: 'US' },
            hasTargetingKey: false
        },
        {
            context: { targetingKey: null, country: 'US' },
            hasTargetingKey: false
        },
        {
            context: { targetingKey: '', country: 'US' },
            hasTargetingKey: true
        }
    ])(
        'preserves targeting-key presence before normalization on initialize and context change: %j',
        async ({ context, hasTargetingKey }) => {
            const provider = new DatadogOpenFeatureProvider();
            // Null is untrusted runtime input outside the typed OpenFeature contract.
            const input = (context as unknown) as EvaluationContext;
            const normalized = {
                targetingKey: '',
                attributes: { country: 'US' }
            };

            await provider.initialize(input);
            expect(
                mockFlagsClient.__ddSetEvaluationContext
            ).toHaveBeenCalledTimes(1);
            expect(
                mockFlagsClient.__ddSetEvaluationContext
            ).toHaveBeenLastCalledWith(normalized, hasTargetingKey);

            await provider.onContextChange({ targetingKey: 'previous' }, input);
            expect(
                mockFlagsClient.__ddSetEvaluationContext
            ).toHaveBeenCalledTimes(2);
            expect(
                mockFlagsClient.__ddSetEvaluationContext
            ).toHaveBeenLastCalledWith(normalized, hasTargetingKey);
            expect(
                mockFlagsClient.setEvaluationContextWithoutFetching
            ).not.toHaveBeenCalled();
        }
    );

    it('captures subject presence before a queued context update can be mutated', async () => {
        let releaseInitial: () => void = () => undefined;
        const initialFetch = new Promise<void>(resolve => {
            releaseInitial = resolve;
        });
        mockFlagsClient.__ddSetEvaluationContext.mockImplementationOnce(
            () => initialFetch
        );
        const provider = new DatadogOpenFeatureProvider();
        const initializing = provider.initialize({ targetingKey: 'initial' });
        const nextContext = { targetingKey: 'queued-user', country: 'US' };
        const updating = provider.onContextChange({}, nextContext);

        Reflect.deleteProperty(nextContext, 'targetingKey');
        releaseInitial();
        await initializing;
        await updating;

        expect(
            mockFlagsClient.__ddSetEvaluationContext
        ).toHaveBeenNthCalledWith(
            2,
            { targetingKey: 'queued-user', attributes: { country: 'US' } },
            true
        );
    });

    it('recovers after a context update fails', async () => {
        const provider = new DatadogOpenFeatureProvider();
        mockFlagsClient.__ddSetEvaluationContext
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('temporarily offline'))
            .mockResolvedValueOnce(undefined);

        await provider.initialize({ targetingKey: 'user-1' });

        await expect(
            provider.onContextChange(
                { targetingKey: 'user-1' },
                { targetingKey: 'user-2' }
            )
        ).rejects.toThrow('temporarily offline');

        await expect(
            provider.onContextChange(
                { targetingKey: 'user-2' },
                { targetingKey: 'user-3' }
            )
        ).resolves.toBeUndefined();

        expect(mockFlagsClient.__ddSetEvaluationContext).toHaveBeenCalledTimes(
            3
        );
        expect(
            mockFlagsClient.__ddSetEvaluationContext
        ).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({ targetingKey: 'user-3' }),
            true
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
