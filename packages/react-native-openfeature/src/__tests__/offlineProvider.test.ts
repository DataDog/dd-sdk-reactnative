/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ProviderEvents } from '@openfeature/web-sdk';

import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

const mockFlagsClient = {
    setConfiguration: jest.fn(() => 'ready'),
    setEvaluationContextWithoutFetching: jest.fn(() => 'ready'),
    setEvaluationContext: jest.fn(() => Promise.resolve()),
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

describe('DatadogOfflineOpenFeatureProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFlagsClient.setConfiguration.mockReturnValue('ready');
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValue(
            'ready'
        );
    });

    it('advertises the offline provider name', () => {
        expect(new DatadogOfflineOpenFeatureProvider().metadata.name).toBe(
            'datadog-react-native-offline'
        );
    });

    it('never fetches on initialize (uses the no-fetch context setter)', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.initialize({ targetingKey: 'user-1' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalled();
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('never fetches on a context change', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' })
        );
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('delegates setConfiguration to the client and emits READY then CONFIGURATION_CHANGED', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        provider.setConfiguration({} as never);
        provider.setConfiguration({} as never);

        expect(mockFlagsClient.setConfiguration).toHaveBeenCalledTimes(2);
        expect(emitSpy).toHaveBeenNthCalledWith(1, ProviderEvents.Ready);
        expect(emitSpy).toHaveBeenNthCalledWith(
            2,
            ProviderEvents.ConfigurationChanged
        );
    });

    it('emits PROVIDER_ERROR on a mismatched configuration', () => {
        mockFlagsClient.setConfiguration.mockReturnValueOnce('mismatch');
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        provider.setConfiguration({} as never);

        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({ message: expect.any(String) })
        );
    });

    it('resolves boolean evaluation through the client', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        const result = provider.resolveBooleanEvaluation(
            'flag',
            false,
            {},
            // eslint-disable-next-line no-console
            console as never
        );

        expect(result.value).toBe(true);
        expect(mockFlagsClient.getBooleanDetails).toHaveBeenCalledWith(
            'flag',
            false
        );
    });
});
