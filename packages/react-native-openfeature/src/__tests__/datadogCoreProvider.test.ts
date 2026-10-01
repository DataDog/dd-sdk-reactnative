/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationFromString } from '@datadog/flagging-core/rules-based';
import * as flaggingCore from '@datadog/flagging-core';
import type { FlagsConfiguration } from '@datadog/flagging-core';
import {
    ErrorCode,
    InvalidContextError,
    ParseError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';
import type { EvaluationContext, Logger } from '@openfeature/web-sdk';

import packageJson from '../../package.json';
import { DatadogCoreProvider } from '../rules-based';

import {
    matchingContext,
    precomputedConfiguration,
    rulesConfiguration
} from './__utils__/coreConfiguration';

// Make the CommonJS barrel's re-exports spyable while retaining the real implementations.
jest.mock('@datadog/flagging-core', () => ({
    __esModule: true,
    ...jest.requireActual('@datadog/flagging-core')
}));

// No native SDK initialization, networking, or tracking is needed for this provider.
jest.mock('@datadog/mobile-react-native', () => {
    throw new Error('The core provider must not import the native SDK');
});

const logger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

function configuredProvider(
    configuration: FlagsConfiguration
): DatadogCoreProvider {
    const provider = new DatadogCoreProvider();
    provider.setConfiguration(configuration);
    return provider;
}

const configurationId = (provider: DatadogCoreProvider): unknown =>
    provider.resolveBooleanEvaluation(
        'boolean-flag',
        false,
        matchingContext,
        logger
    ).flagMetadata?.__dd_core_configuration_id;

const rulesConfigurationId = (provider: DatadogCoreProvider): unknown =>
    provider.resolveBooleanEvaluation(
        'test-flag',
        false,
        matchingContext,
        logger
    ).flagMetadata?.__dd_core_configuration_id;

describe('DatadogCoreProvider', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('pins the evaluator to the React Native-tested version without a semver range', () => {
        expect(packageJson.dependencies['@datadog/flagging-core']).toBe(
            '3.1.1'
        );
    });

    it('has browser-compatible metadata and stores the supplied configuration', () => {
        const provider = new DatadogCoreProvider();
        expect(provider.metadata).toEqual({ name: 'datadog-core' });
        expect(provider.runsOn).toBe('client');
        expect(provider.getConfiguration()).toBeUndefined();

        const configuration = precomputedConfiguration();
        provider.setConfiguration(configuration);
        expect(provider.getConfiguration()).toBe(configuration);
    });

    it('delegates all four evaluation types to the published flagging-core evaluator', () => {
        const configuration = precomputedConfiguration();
        const provider = configuredProvider(configuration);
        const evaluate = jest.spyOn(flaggingCore, 'evaluate');
        const defaultObject = { nested: { enabled: false }, list: [] };

        expect(
            provider.resolveBooleanEvaluation(
                'boolean-flag',
                false,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: true,
            variant: 'on',
            reason: 'TARGETING_MATCH'
        });
        expect(
            provider.resolveStringEvaluation(
                'string-flag',
                'default',
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: 'hello',
            variant: 'greeting',
            reason: 'STATIC'
        });
        expect(
            provider.resolveNumberEvaluation(
                'number-flag',
                0,
                matchingContext,
                logger
            )
        ).toMatchObject({ value: 3.14, variant: 'amount', reason: 'STATIC' });
        expect(
            provider.resolveObjectEvaluation(
                'object-flag',
                defaultObject,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: { nested: { enabled: true }, list: [1, 2] },
            variant: 'settings'
        });

        expect(evaluate.mock.calls).toEqual([
            [
                configuration,
                'boolean',
                'boolean-flag',
                false,
                matchingContext,
                logger
            ],
            [
                configuration,
                'string',
                'string-flag',
                'default',
                matchingContext,
                logger
            ],
            [
                configuration,
                'number',
                'number-flag',
                0,
                matchingContext,
                logger
            ],
            [
                configuration,
                'object',
                'object-flag',
                defaultObject,
                matchingContext,
                logger
            ]
        ]);
    });

    it('preserves flag-not-found and type-mismatch defaults and error details', () => {
        const provider = configuredProvider(precomputedConfiguration());
        expect(
            provider.resolveBooleanEvaluation(
                'missing',
                false,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: false,
            reason: 'ERROR',
            errorCode: ErrorCode.FLAG_NOT_FOUND
        });
        expect(
            provider.resolveNumberEvaluation(
                'boolean-flag',
                42,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: 42,
            reason: 'ERROR',
            errorCode: ErrorCode.TYPE_MISMATCH
        });
    });

    it('evaluates rules locally with the supplied context', async () => {
        const provider = configuredProvider(rulesConfiguration());
        const otherContext = { targetingKey: 'user-1', country: 'CA' };
        await provider.initialize(otherContext);
        expect(
            provider.resolveBooleanEvaluation(
                'test-flag',
                false,
                otherContext,
                logger
            )
        ).toMatchObject({
            value: false,
            variant: 'off',
            reason: 'SPLIT',
            flagMetadata: { doLog: false }
        });

        provider.onContextChange(otherContext, matchingContext);
        expect(
            provider.resolveBooleanEvaluation(
                'test-flag',
                false,
                matchingContext,
                logger
            )
        ).toMatchObject({
            value: true,
            variant: 'on',
            reason: 'TARGETING_MATCH',
            flagMetadata: { allocationKey: 'allocation', doLog: true }
        });
    });

    it('prefers matching precomputed data and falls back to rules for a different context', async () => {
        const provider = configuredProvider({
            ...rulesConfiguration(),
            ...precomputedConfiguration()
        });
        await provider.initialize(matchingContext);
        expect(
            provider.resolveStringEvaluation(
                'string-flag',
                'default',
                matchingContext,
                logger
            ).value
        ).toBe('hello');
        // No per-flag fallback to rules when the precomputed capability matches.
        expect(
            provider.resolveBooleanEvaluation(
                'test-flag',
                false,
                matchingContext,
                logger
            ).errorCode
        ).toBe(ErrorCode.FLAG_NOT_FOUND);

        const otherContext = { targetingKey: 'user-2', country: 'US' };
        provider.onContextChange(matchingContext, otherContext);
        expect(
            provider.resolveBooleanEvaluation(
                'test-flag',
                false,
                otherContext,
                logger
            ).value
        ).toBe(true);
    });

    it('can use a valid capability even if the other capability failed to parse', async () => {
        const rules = configuredProvider({
            ...rulesConfiguration(),
            precomputedError: 'Malformed precomputed data'
        });
        await expect(
            rules.initialize(matchingContext)
        ).resolves.toBeUndefined();
        expect(
            rules.resolveBooleanEvaluation(
                'test-flag',
                false,
                matchingContext,
                logger
            ).value
        ).toBe(true);

        const precomputed = configuredProvider({
            ...precomputedConfiguration(),
            rulesError: 'Malformed rules data'
        });
        await expect(
            precomputed.initialize(matchingContext)
        ).resolves.toBeUndefined();
        expect(
            precomputed.resolveBooleanEvaluation(
                'boolean-flag',
                false,
                matchingContext,
                logger
            ).value
        ).toBe(true);
        expect(() => precomputed.onContextChange(matchingContext, {})).toThrow(
            ParseError
        );
        expect(
            precomputed.resolveBooleanEvaluation(
                'boolean-flag',
                false,
                {},
                logger
            )
        ).toMatchObject({
            value: false,
            reason: 'ERROR',
            errorCode: ErrorCode.PARSE_ERROR,
            errorMessage: 'Malformed rules data'
        });
    });

    it.each([
        {},
        ({ targetingKey: undefined } as unknown) as EvaluationContext
    ])(
        'does not adopt the embedded precomputed context when initialized with %p',
        async context => {
            const provider = configuredProvider(precomputedConfiguration());
            await expect(provider.initialize(context)).rejects.toBeInstanceOf(
                InvalidContextError
            );
            expect(
                provider.resolveBooleanEvaluation(
                    'boolean-flag',
                    false,
                    context,
                    logger
                )
            ).toMatchObject({
                value: false,
                reason: 'ERROR',
                errorCode: ErrorCode.INVALID_CONTEXT
            });
        }
    );

    it('rejects missing configuration and returns provider-not-ready evaluation details', async () => {
        const provider = new DatadogCoreProvider();
        await expect(provider.initialize()).rejects.toBeInstanceOf(
            ProviderNotReadyError
        );
        expect(
            provider.resolveBooleanEvaluation('missing', true, {}, logger)
        ).toEqual({
            value: true,
            reason: 'ERROR',
            errorCode: ErrorCode.PROVIDER_NOT_READY,
            errorMessage: 'No flags configuration has been set'
        });
    });

    it.each([
        {},
        configurationFromString('not json'),
        { rulesError: 'Malformed rules data' }
    ])(
        'rejects an unusable configuration with a parse error',
        async configuration => {
            const provider = configuredProvider(configuration);
            await expect(provider.initialize()).rejects.toBeInstanceOf(
                ParseError
            );
            expect(
                provider.resolveBooleanEvaluation('missing', true, {}, logger)
            ).toMatchObject({
                value: true,
                reason: 'ERROR',
                errorCode: ErrorCode.PARSE_ERROR
            });
        }
    );

    it.each([null, undefined, 'not a configuration', 42])(
        'rejects a non-object runtime configuration (%p) with a parse error',
        async configuration => {
            const provider = configuredProvider(
                (configuration as unknown) as FlagsConfiguration
            );
            await expect(provider.initialize()).rejects.toBeInstanceOf(
                ParseError
            );
            expect(
                provider.resolveBooleanEvaluation('missing', true, {}, logger)
            ).toEqual({
                value: true,
                reason: 'ERROR',
                errorCode: ErrorCode.PARSE_ERROR,
                errorMessage: 'Flags configuration must be an object'
            });
        }
    );

    it('replaces a usable configuration with a parse error when given null after initialization', async () => {
        const provider = configuredProvider(rulesConfiguration());
        await provider.initialize({});
        const errorHandler = jest.fn();
        provider.events.addHandler(ProviderEvents.Error, errorHandler);

        expect(() =>
            provider.setConfiguration((null as unknown) as FlagsConfiguration)
        ).not.toThrow();
        expect(errorHandler).toHaveBeenLastCalledWith({
            error: expect.any(ParseError),
            message: 'Flags configuration must be an object',
            errorCode: ErrorCode.PARSE_ERROR
        });
        expect(
            provider.resolveBooleanEvaluation('test-flag', false, {}, logger)
        ).toMatchObject({
            value: false,
            reason: 'ERROR',
            errorCode: ErrorCode.PARSE_ERROR
        });
        expect(rulesConfigurationId(provider)).toBeUndefined();

        // A later valid configuration recovers.
        const readyHandler = jest.fn();
        provider.events.addHandler(ProviderEvents.Ready, readyHandler);
        provider.setConfiguration(rulesConfiguration());
        expect(readyHandler).toHaveBeenCalledTimes(1);
    });

    it('defers configuration events and validation until initialization supplies the context', async () => {
        const provider = new DatadogCoreProvider();
        const handler = jest.fn();
        provider.events.addHandler(ProviderEvents.Ready, handler);
        provider.events.addHandler(
            ProviderEvents.ConfigurationChanged,
            handler
        );
        provider.events.addHandler(ProviderEvents.Error, handler);
        provider.setConfiguration({});
        provider.setConfiguration(precomputedConfiguration());
        expect(handler).not.toHaveBeenCalled();
        await expect(
            provider.initialize(matchingContext)
        ).resolves.toBeUndefined();
    });

    it('emits Ready then ConfigurationChanged when recovering, and only ConfigurationChanged on replacement', async () => {
        const provider = new DatadogCoreProvider();
        const events: string[] = [];
        provider.events.addHandler(ProviderEvents.Ready, () =>
            events.push('ready')
        );
        provider.events.addHandler(ProviderEvents.ConfigurationChanged, () =>
            events.push('changed')
        );
        await expect(provider.initialize(matchingContext)).rejects.toThrow();

        provider.setConfiguration(precomputedConfiguration());
        expect(events).toEqual(['ready', 'changed']);
        provider.setConfiguration(rulesConfiguration());
        expect(events).toEqual(['ready', 'changed', 'changed']);
    });

    it('emits precise error events for invalid replacement configurations and context mismatches', async () => {
        const provider = configuredProvider(rulesConfiguration());
        const errorHandler = jest.fn();
        const changedHandler = jest.fn();
        await provider.initialize({});
        provider.events.addHandler(ProviderEvents.Error, errorHandler);
        provider.events.addHandler(
            ProviderEvents.ConfigurationChanged,
            changedHandler
        );

        provider.setConfiguration({});
        expect(errorHandler).toHaveBeenLastCalledWith({
            error: expect.any(ParseError),
            message: 'Flags configuration contains no usable capability',
            errorCode: ErrorCode.PARSE_ERROR
        });
        provider.setConfiguration(precomputedConfiguration());
        expect(errorHandler).toHaveBeenLastCalledWith({
            error: expect.any(InvalidContextError),
            message:
                'Precomputed flags configuration does not match the current context',
            errorCode: ErrorCode.INVALID_CONTEXT
        });
        expect(changedHandler).not.toHaveBeenCalled();
    });

    it('retains the new context even when reconciliation throws', async () => {
        const provider = configuredProvider(precomputedConfiguration());
        const readyHandler = jest.fn();
        provider.events.addHandler(ProviderEvents.Ready, readyHandler);
        await provider.initialize(matchingContext);
        expect(() =>
            provider.onContextChange(matchingContext, { targetingKey: 'other' })
        ).toThrow(InvalidContextError);
        const replacement = precomputedConfiguration();
        replacement.precomputed.context = { targetingKey: 'other' };
        provider.setConfiguration(replacement);
        expect(readyHandler).toHaveBeenCalledTimes(1);
    });

    it('adds configuration identity only to trackable evaluations', () => {
        const provider = configuredProvider(precomputedConfiguration());
        expect(configurationId(provider)).toEqual(expect.any(String));
        expect(
            provider.resolveStringEvaluation(
                'string-flag',
                '',
                matchingContext,
                logger
            ).flagMetadata?.__dd_core_configuration_id
        ).toBeUndefined();
        expect(
            provider.resolveBooleanEvaluation(
                'missing',
                false,
                matchingContext,
                logger
            ).flagMetadata?.__dd_core_configuration_id
        ).toBeUndefined();
    });

    it('keeps configuration identity stable across retrieval metadata changes, but not value changes', () => {
        const configuration = precomputedConfiguration();
        const provider = configuredProvider(configuration);
        const original = configurationId(provider);
        provider.setConfiguration({
            precomputed: {
                ...configuration.precomputed,
                etag: 'new',
                fetchedAt: flaggingCore.timeStampNow()
            }
        });
        expect(configurationId(provider)).toBe(original);
        const replacement = precomputedConfiguration();
        replacement.precomputed.response.data.attributes.flags[
            'boolean-flag'
        ].variationValue = false;
        provider.setConfiguration(replacement);
        expect(configurationId(provider)).not.toBe(original);
    });

    it('keeps rules identity stable across retrieval metadata and build timestamp changes', () => {
        const configuration = rulesConfiguration();
        const provider = configuredProvider(configuration);
        const original = rulesConfigurationId(provider);
        const createdAt = configuration.rules.response.createdAt;
        if (!createdAt) {
            throw new Error('Rules fixture must have a build timestamp');
        }
        provider.setConfiguration({
            rules: {
                ...configuration.rules,
                response: {
                    ...configuration.rules.response,
                    createdAt: {
                        ...createdAt,
                        nanos: 123
                    }
                },
                etag: 'new',
                fetchedAt: flaggingCore.timeStampNow()
            }
        });
        expect(rulesConfigurationId(provider)).toBe(original);
    });

    it('still loads configuration and assigns a distinct fallback identity if hashing fails', () => {
        jest.spyOn(flaggingCore, 'getMD5Hash').mockImplementation(() => {
            throw new Error('hash failed');
        });
        const provider = configuredProvider(precomputedConfiguration());
        expect(configurationId(provider)).toBe('core-configuration-1');
        provider.setConfiguration(precomputedConfiguration());
        expect(configurationId(provider)).toBe('core-configuration-2');
    });
});
