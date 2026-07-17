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

    it('does not stamp an empty context on initialize', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.initialize({});

        // An empty OpenFeature context must not override the configuration's embedded context.
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('records a non-empty context without fetching', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.initialize({ targetingKey: 'user-1' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-1' })
        );
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('reconciles a non-empty context change without fetching or signalling a change', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        await provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' })
        );
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
        // A precomputed snapshot is context-independent, so a context change is not a
        // configuration change — no PROVIDER_CONFIGURATION_CHANGED is emitted.
        expect(emitSpy).not.toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
    });

    it('treats a context with only an undefined targetingKey as empty', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.onContextChange({}, { targetingKey: undefined });

        // `{ targetingKey: undefined }` carries no information and must not override the
        // configuration's embedded context.
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('delegates setConfiguration to the client and emits CONFIGURATION_CHANGED', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        provider.setConfiguration({} as never);

        expect(mockFlagsClient.setConfiguration).toHaveBeenCalled();
        // The provider is already READY from initialize; a loaded config is a config change.
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
        expect(emitSpy).not.toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('emits PROVIDER_ERROR on an invalid configuration, then READY on recovery', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        mockFlagsClient.setConfiguration.mockReturnValueOnce('invalid');
        provider.setConfiguration({} as never);
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({ message: expect.any(String) })
        );

        // A subsequent valid config recovers — emit READY to clear the error status.
        provider.setConfiguration({} as never);
        expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('rejects initialize when a config was loaded (pre-registration) and is invalid', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setConfiguration.mockReturnValueOnce('invalid');
        provider.setConfiguration({} as never);

        // The PROVIDER_ERROR emitted by setConfiguration had no listeners yet, so initialize
        // must reject — OpenFeature then starts the provider in ERROR, not a misleading READY.
        await expect(provider.initialize({})).rejects.toThrow();
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
