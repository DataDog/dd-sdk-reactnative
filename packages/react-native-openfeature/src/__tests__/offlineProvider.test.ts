/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    ErrorCode,
    GeneralError,
    InvalidContextError,
    ParseError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';

import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

const READY = { status: 'ready' as const };
const mismatch = { status: 'error' as const, errorCode: 'INVALID_CONTEXT' };
const notReady = { status: 'error' as const, errorCode: 'PROVIDER_NOT_READY' };
const parseError = { status: 'error' as const, errorCode: 'PARSE_ERROR' };
const generalError = { status: 'error' as const, errorCode: 'GENERAL' };

const mockFlagsClient = {
    setConfiguration: jest.fn(() => READY),
    setEvaluationContextWithoutFetching: jest.fn(() => READY),
    resetEvaluationContextWithoutFetching: jest.fn(() => READY),
    setEvaluationContext: jest.fn(() => Promise.resolve()),
    getDetailsForContext: jest.fn(() => ({
        key: 'flag',
        value: true,
        reason: 'TARGETING_MATCH',
        variant: 'true'
    })),
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
        mockFlagsClient.setConfiguration.mockReturnValue(READY);
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValue(
            READY
        );
        mockFlagsClient.resetEvaluationContextWithoutFetching.mockReturnValue(
            READY
        );
    });

    it('advertises the offline provider name', () => {
        expect(new DatadogOfflineOpenFeatureProvider().metadata.name).toBe(
            'datadog-react-native-offline'
        );
    });

    it('records an empty initialize context without fetching', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        await provider.initialize({});

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith({ attributes: {} });
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
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

    it('does not replace a missing targeting key in an attributes-only context', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({}, { country: 'US' });

        const context =
            mockFlagsClient.setEvaluationContextWithoutFetching.mock
                .calls[0][0];
        expect(context).toEqual({ attributes: { country: 'US' } });
        expect(context).not.toHaveProperty('targetingKey');
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
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValueOnce(
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

    it('treats a cleared or empty context as the effective context', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({ targetingKey: 'user-1' }, {});

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith({ attributes: {} });
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('does not invent a targeting key when it is undefined', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({}, { targetingKey: undefined });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith({ attributes: {} });
        expect(
            mockFlagsClient.resetEvaluationContextWithoutFetching
        ).not.toHaveBeenCalled();
    });

    it('preserves an explicit empty targeting key', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.onContextChange({}, { targetingKey: '' });

        expect(
            mockFlagsClient.setEvaluationContextWithoutFetching
        ).toHaveBeenCalledWith({ targetingKey: '', attributes: {} });
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

    it('emits PROVIDER_ERROR with a top-level parse error code on an invalid configuration', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        mockFlagsClient.setConfiguration.mockReturnValueOnce(parseError);
        provider.setConfiguration({} as never);

        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.objectContaining({
                message: expect.any(String),
                errorCode: ErrorCode.PARSE_ERROR
            })
        );
    });

    it('preserves a general code for an unexpected configuration error', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const emitSpy = jest.spyOn(provider.events, 'emit');

        mockFlagsClient.setConfiguration.mockReturnValueOnce(generalError);
        provider.setConfiguration({} as never);

        expect(emitSpy).toHaveBeenCalledWith(ProviderEvents.Error, {
            message:
                'The Datadog offline provider cannot serve the loaded configuration for the current context.',
            errorCode: ErrorCode.GENERAL
        });
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
        expect(emitSpy.mock.calls.slice(-2).map(([event]) => event)).toEqual([
            ProviderEvents.Ready,
            ProviderEvents.ConfigurationChanged
        ]);
    });

    it('rejects initialize when a config was loaded (pre-registration) and is invalid', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setConfiguration.mockReturnValueOnce(parseError);
        provider.setConfiguration({} as never);

        // A pre-registration setConfiguration error had no listeners, and the empty initialize
        // context reconciles to the same error, so initialize rejects -> the Web SDK starts the
        // provider in ERROR rather than a misleading READY.
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValueOnce(
            parseError
        );
        await expect(provider.initialize({})).rejects.toThrow(ParseError);
    });

    it('maps unexpected initialize errors to GeneralError', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        mockFlagsClient.setEvaluationContextWithoutFetching.mockReturnValueOnce(
            generalError
        );

        await expect(provider.initialize({})).rejects.toThrow(GeneralError);
    });

    it('resolves boolean evaluation through the client', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        const result = provider.resolveBooleanEvaluation(
            'flag',
            false,
            { targetingKey: 'user-1', country: 'US' },
            // eslint-disable-next-line no-console
            console as never
        );

        expect(result.value).toBe(true);
        expect(mockFlagsClient.getDetailsForContext).toHaveBeenCalledWith(
            'flag',
            false,
            'boolean',
            {
                targetingKey: 'user-1',
                attributes: { country: 'US' }
            },
            console
        );
        expect(mockFlagsClient.getBooleanDetails).not.toHaveBeenCalled();
    });

    it('passes an empty effective context through per-resolution evaluation', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        // eslint-disable-next-line no-console
        const logger = console as never;

        provider.resolveBooleanEvaluation('flag', false, {}, logger);

        expect(mockFlagsClient.getDetailsForContext).toHaveBeenCalledWith(
            'flag',
            false,
            'boolean',
            { attributes: {} },
            logger
        );
        expect(mockFlagsClient.getBooleanDetails).not.toHaveBeenCalled();
    });

    it('preserves a missing targeting key for per-resolution evaluation', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();

        provider.resolveBooleanEvaluation(
            'flag',
            false,
            { country: 'US' },
            // eslint-disable-next-line no-console
            console as never
        );

        const context = mockFlagsClient.getDetailsForContext.mock.calls[0][3];
        expect(context).toEqual({ attributes: { country: 'US' } });
        expect(context).not.toHaveProperty('targetingKey');
    });

    it('passes the effective context and logger through every resolver', () => {
        const provider = new DatadogOfflineOpenFeatureProvider();
        const context = { targetingKey: 'user-1', country: 'US' };
        // eslint-disable-next-line no-console
        const logger = console as never;

        provider.resolveStringEvaluation(
            'string-flag',
            'default',
            context,
            logger
        );
        provider.resolveNumberEvaluation('number-flag', 0, context, logger);
        provider.resolveObjectEvaluation('object-flag', {}, context, logger);

        const ddContext = {
            targetingKey: 'user-1',
            attributes: { country: 'US' }
        };
        expect(mockFlagsClient.getDetailsForContext).toHaveBeenNthCalledWith(
            1,
            'string-flag',
            'default',
            'string',
            ddContext,
            logger
        );
        expect(mockFlagsClient.getDetailsForContext).toHaveBeenNthCalledWith(
            2,
            'number-flag',
            0,
            'number',
            ddContext,
            logger
        );
        expect(mockFlagsClient.getDetailsForContext).toHaveBeenNthCalledWith(
            3,
            'object-flag',
            {},
            'object',
            ddContext,
            logger
        );
    });
});
