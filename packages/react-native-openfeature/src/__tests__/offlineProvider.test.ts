/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagsClient } from '@datadog/mobile-react-native';
import type { EvaluationContext } from '@openfeature/web-sdk';
import {
    ErrorCode,
    GeneralError,
    InvalidContextError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';

import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

import {
    precomputedConfiguration,
    rulesConfiguration
} from './__utils__/coreConfiguration';

type ConfigurationResult = ReturnType<FlagsClient['setConfiguration']>;
const READY: ConfigurationResult = { status: 'ready' };
const mismatch: ConfigurationResult = {
    status: 'error',
    errorCode: 'INVALID_CONTEXT'
};
const notReady: ConfigurationResult = {
    status: 'error',
    errorCode: 'PROVIDER_NOT_READY'
};
const generalError: ConfigurationResult = {
    status: 'error',
    errorCode: 'GENERAL'
};

const mockFlagsClient = {
    setConfiguration: jest.fn((): ConfigurationResult => READY),
    setEvaluationContextWithoutFetching: jest.fn(
        (): ConfigurationResult => READY
    ),
    resetEvaluationContextWithoutFetching: jest.fn(
        (): ConfigurationResult => READY
    ),
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

describe('DatadogOfflineOpenFeatureProvider (legacy core SDK without the evaluator bridge)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFlagsClient.setConfiguration.mockReturnValue(READY);
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValue(
            READY
        );
        mockFlagsClient.resetEvaluationContextWithoutFetching.mockReturnValue(
            READY
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('rejects rules on an older core SDK instead of silently ignoring them or serving stale flags', () => {
        const warning = jest
            .spyOn(console, 'warn')
            .mockImplementation(() => {});
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emit = jest.spyOn(provider.events, 'emit');

        provider.setConfiguration(rulesConfiguration());

        expect(mockFlagsClient.setConfiguration).toHaveBeenCalledWith({});
        expect(emit).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({ errorCode: ErrorCode.GENERAL })
        );
        expect(warning).toHaveBeenCalledWith(
            expect.stringContaining('Update both Datadog packages together')
        );
    });

    it('keeps usable precomputed data on an older core SDK when only the rules branch failed to parse', () => {
        const warning = jest
            .spyOn(console, 'warn')
            .mockImplementation(() => {});
        const provider = new DatadogOfflineOpenFeatureProvider();
        const configuration = {
            ...precomputedConfiguration(),
            rulesError: 'Malformed rules'
        };

        provider.setConfiguration(configuration);

        expect(mockFlagsClient.setConfiguration).toHaveBeenCalledWith(
            configuration
        );
        expect(warning).not.toHaveBeenCalled();
    });

    it('advertises the offline provider name', () => {
        expect(new DatadogOfflineOpenFeatureProvider().metadata.name).toBe(
            'datadog-react-native-offline'
        );
    });

    it('re-adopts the embedded context on an empty initialize context', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.initialize({});

        // An empty context means "no external override": reset to the embedded context rather
        // than setting an (empty) override.
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
        ).toHaveBeenCalled();
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

    it('rejects initialize when the initial context does not match', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValueOnce(
            mismatch
        );

        await expect(
            provider.initialize({ targetingKey: 'user-2' })
        ).rejects.toThrow(InvalidContextError);
    });

    it('rejects initialize when no configuration is loaded (provider-first)', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.resetEvaluationContextWithoutFetching.mockReturnValueOnce(
            notReady
        );

        await expect(provider.initialize({})).rejects.toThrow(
            ProviderNotReadyError
        );
    });

    it('reconciles a matching context change without fetching or signalling a change', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        provider.onContextChange({}, { targetingKey: 'user-2' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith(
            expect.objectContaining({ targetingKey: 'user-2' })
        );
        expect(mockFlagsClient.setEvaluationContext).not.toHaveBeenCalled();
        // The Web SDK owns the READY/CONTEXT_CHANGED transition on a resolving context change;
        // the provider itself emits nothing.
        expect(emitSpy).not.toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
        expect(emitSpy).not.toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('throws synchronously from onContextChange on a mismatching context', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValueOnce(
            mismatch
        );

        // Synchronous throw so the Web SDK transitions straight to ERROR (no async race).
        expect(() =>
            provider.onContextChange({}, { targetingKey: 'user-2' })
        ).toThrow(InvalidContextError);
    });

    it('re-adopts the embedded context on clearContext / empty context change', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({ targetingKey: 'user-1' }, {});

        // Clearing context is not a mismatch: it re-adopts the embedded context and does not throw.
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
        ).toHaveBeenCalled();
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('treats a context with only an undefined targetingKey as empty', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({}, ({
            targetingKey: undefined
        } as unknown) as EvaluationContext);

        // `{ targetingKey: undefined }` carries no information: reset to the embedded context.
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
        ).toHaveBeenCalled();
        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('delegates setConfiguration to the client and emits CONFIGURATION_CHANGED', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        provider.setConfiguration({} as never);

        expect(mockFlagsClient.setConfiguration).toHaveBeenCalled();
        // A healthy (re)loaded config is a configuration change, not a status transition.
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
        expect(emitSpy).not.toHaveBeenCalledWith(ProviderEvents.Ready);
    });

    it('emits PROVIDER_ERROR with a top-level errorCode on an invalid configuration', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        mockFlagsClient.setConfiguration.mockReturnValueOnce(generalError);
        provider.setConfiguration({} as never);

        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({
                message: expect.any(String),
                errorCode: ErrorCode.GENERAL
            })
        );
    });

    it('recovers on a later valid configuration, emitting READY then CONFIGURATION_CHANGED', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        mockFlagsClient.setConfiguration.mockReturnValueOnce(mismatch);
        provider.setConfiguration({} as never);
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({ errorCode: ErrorCode.INVALID_CONTEXT })
        );

        // A subsequent valid config recovers: READY clears the ERROR status, CONFIGURATION_CHANGED
        // signals the new flags.
        provider.setConfiguration({} as never);
        expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Ready);
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
    });

    it('rejects initialize when a config was loaded (pre-registration) and is invalid', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setConfiguration.mockReturnValueOnce(generalError);
        provider.setConfiguration({} as never);

        // A pre-registration setConfiguration error had no listeners, and the empty initialize
        // context reconciles to the same error, so initialize rejects -> the Web SDK starts the
        // provider in ERROR rather than a misleading READY.
        mockFlagsClient.resetEvaluationContextWithoutFetching.mockReturnValueOnce(
            generalError
        );
        await expect(provider.initialize({})).rejects.toThrow(GeneralError);
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
