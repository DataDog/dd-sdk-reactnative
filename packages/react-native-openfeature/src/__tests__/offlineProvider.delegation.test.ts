/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationToString } from '@datadog/flagging-core/rules-based';
import type { FlagsConfiguration } from '@datadog/flagging-core';
import {
    configurationFromString,
    DdFlags,
    InternalLog
} from '@datadog/mobile-react-native';
import type { EvaluationContext } from '@openfeature/web-sdk';
import {
    ErrorCode,
    OpenFeature,
    ProviderEvents,
    ProviderStatus
} from '@openfeature/web-sdk';

import NativeDdFlagsModule from '../../../core/src/specs/NativeDdFlags';
import { DatadogCoreProvider } from '../datadogCoreProvider';
import { DatadogOfflineOpenFeatureProvider } from '../index';
import { coreConfigurationFromString } from '../rules-based';

import {
    matchingContext,
    precomputedConfiguration,
    rulesConfiguration,
    rulesWire
} from './__utils__/coreConfiguration';

jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    }
}));

const NativeDdFlags = jest.mocked(
    NativeDdFlagsModule as NonNullable<typeof NativeDdFlagsModule>
);

let sequence = 0;
const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

function setup(configuration: FlagsConfiguration) {
    const name = `offline-delegation-${sequence++}`;
    const provider = new DatadogOfflineOpenFeatureProvider({
        clientName: name
    });
    provider.setConfiguration(configuration);
    return { provider, name, flagsClient: DdFlags.getClient(name) };
}

describe('Offline provider delegates to DatadogCoreProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
        OpenFeature.clearHandlers();
        jest.restoreAllMocks();
    });

    it('delegates all precomputed types and tracks each result once with the embedded context', async () => {
        const boolean = jest.spyOn(
            DatadogCoreProvider.prototype,
            'resolveBooleanEvaluation'
        );
        const string = jest.spyOn(
            DatadogCoreProvider.prototype,
            'resolveStringEvaluation'
        );
        const number = jest.spyOn(
            DatadogCoreProvider.prototype,
            'resolveNumberEvaluation'
        );
        const object = jest.spyOn(
            DatadogCoreProvider.prototype,
            'resolveObjectEvaluation'
        );
        const { provider, name } = setup(precomputedConfiguration());
        await OpenFeature.setProviderAndWait(provider);
        const client = OpenFeature.getClient();
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        expect(client.getStringValue('string-flag', 'default')).toBe('hello');
        expect(client.getNumberValue('number-flag', 0)).toBe(3.14);
        expect(client.getObjectValue('object-flag', {})).toEqual({
            nested: { enabled: true },
            list: [1, 2]
        });
        for (const resolver of [boolean, string, number, object]) {
            expect(resolver).toHaveBeenCalledTimes(1);
            expect(resolver).toHaveBeenCalledWith(
                expect.any(String),
                expect.anything(),
                matchingContext,
                expect.any(Object)
            );
        }
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledTimes(4);
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledWith(
            name,
            'object-flag',
            expect.objectContaining({
                value: { nested: { enabled: true }, list: [1, 2] },
                variationValue: '{"nested":{"enabled":true},"list":[1,2]}',
                variationType: 'object',
                doLog: false
            }),
            'user-1',
            { country: 'US' }
        );
        expect(NativeDdFlags.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('changes a rules-based value through real OpenFeature context changes and tracks the selected allocation', async () => {
        const resolve = jest.spyOn(
            DatadogCoreProvider.prototype,
            'resolveBooleanEvaluation'
        );
        const { provider, name } = setup(
            coreConfigurationFromString(rulesWire)
        );
        await OpenFeature.setProviderAndWait(provider, {
            targetingKey: 'user-1',
            country: 'CA'
        });
        const client = OpenFeature.getClient();
        expect(client.getBooleanDetails('test-flag', true)).toMatchObject({
            value: false,
            variant: 'off',
            reason: 'SPLIT',
            flagMetadata: { allocationKey: 'fallback' }
        });
        expect(NativeDdFlags.trackEvaluation).toHaveBeenLastCalledWith(
            name,
            'test-flag',
            expect.objectContaining({
                value: false,
                variationValue: 'false',
                variationKey: 'off',
                allocationKey: 'fallback',
                doLog: false,
                serialId: '7'
            }),
            'user-1',
            { country: 'CA' }
        );

        await OpenFeature.setContext(matchingContext);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanDetails('test-flag', false)).toMatchObject({
            value: true,
            variant: 'on',
            reason: 'TARGETING_MATCH'
        });
        expect(NativeDdFlags.trackEvaluation).toHaveBeenLastCalledWith(
            name,
            'test-flag',
            expect.objectContaining({
                value: true,
                variationValue: 'true',
                variationKey: 'on',
                allocationKey: 'allocation',
                doLog: true,
                serialId: '7'
            }),
            'user-1',
            { country: 'US' }
        );
        expect(resolve).toHaveBeenCalledTimes(2);
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledTimes(2);
        expect(NativeDdFlags.setEvaluationContext).not.toHaveBeenCalled();
    });

    it.each([
        {},
        { country: 'CA' },
        { targetingKey: undefined, country: 'CA' },
        { targetingKey: null, country: 'CA' }
    ])(
        'does not shard a missing/null subject, but permits an explicitly empty subject: %j',
        async context => {
            const { provider, flagsClient } = setup(rulesConfiguration());
            // Null is untrusted runtime input, not a valid typed OpenFeature targeting key.
            await OpenFeature.setProviderAndWait(
                provider,
                (context as unknown) as EvaluationContext
            );
            const client = OpenFeature.getClient();
            expect(client.getBooleanDetails('test-flag', true)).toMatchObject({
                value: true,
                reason: 'ERROR',
                errorCode: ErrorCode.TARGETING_KEY_MISSING
            });
            expect(
                flagsClient.getBooleanDetails('test-flag', true)
            ).toMatchObject({
                value: true,
                errorCode: ErrorCode.TARGETING_KEY_MISSING
            });
            expect(NativeDdFlags.trackEvaluation).not.toHaveBeenCalled();

            await OpenFeature.setContext({ targetingKey: '', country: 'CA' });
            expect(client.getBooleanDetails('test-flag', true)).toMatchObject({
                value: false,
                reason: 'SPLIT'
            });
            expect(
                NativeDdFlags.trackEvaluation
            ).toHaveBeenLastCalledWith(
                expect.any(String),
                'test-flag',
                expect.objectContaining({ value: false }),
                '',
                { country: 'CA' }
            );
            expect(NativeDdFlags.setEvaluationContext).not.toHaveBeenCalled();
        }
    );

    it('still evaluates unsharded rules without a subject and normalizes native tracking only', async () => {
        const configuration = rulesConfiguration();
        const allocation =
            configuration.rules.response.flags['test-flag'].allocations[0];
        allocation.partitionKey = [];
        allocation.splits.forEach(split => {
            split.ranges = [];
        });
        const { provider } = setup(
            coreConfigurationFromString(configurationToString(configuration))
        );
        await OpenFeature.setProviderAndWait(provider, { country: 'US' });
        expect(
            OpenFeature.getClient().getBooleanDetails('test-flag', false)
        ).toMatchObject({
            value: true,
            reason: 'TARGETING_MATCH'
        });
        expect(
            NativeDdFlags.trackEvaluation
        ).toHaveBeenLastCalledWith(
            expect.any(String),
            'test-flag',
            expect.objectContaining({ value: true }),
            '',
            { country: 'US' }
        );
    });

    it('retains precomputed anonymous normalization for missing, null and explicit-empty contexts', async () => {
        const configuration = precomputedConfiguration();
        configuration.precomputed.context = { country: 'CA' };
        const { provider } = setup(configuration);
        await OpenFeature.setProviderAndWait(provider);
        const client = OpenFeature.getClient();
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        for (const context of [
            { country: 'CA' },
            { targetingKey: null, country: 'CA' },
            { targetingKey: '', country: 'CA' }
        ]) {
            // Reconcile each transition on the same client before asserting its value.
            // eslint-disable-next-line no-await-in-loop
            await OpenFeature.setContext(
                (context as unknown) as EvaluationContext
            );
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        }
        expect(NativeDdFlags.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('shares subject presence across aliases, replacements, resets and combined-source selection', async () => {
        const { provider, name, flagsClient } = setup(rulesConfiguration());
        const alias = new DatadogOfflineOpenFeatureProvider({
            clientName: name
        });
        await OpenFeature.setProviderAndWait(provider, { country: 'CA' });
        alias.setConfiguration(rulesConfiguration());
        expect(flagsClient.getBooleanDetails('test-flag', true).errorCode).toBe(
            ErrorCode.TARGETING_KEY_MISSING
        );

        const snapshot = precomputedConfiguration();
        snapshot.precomputed.context = { targetingKey: '', country: 'CA' };
        alias.setConfiguration({ ...rulesConfiguration(), ...snapshot });
        // Precomputed matching still uses normalized anonymous context, not raw subject presence.
        expect(flagsClient.getBooleanValue('boolean-flag', false)).toBe(true);
        expect(flagsClient.getBooleanDetails('test-flag', true).errorCode).toBe(
            ErrorCode.FLAG_NOT_FOUND
        );
        await OpenFeature.setContext({ country: 'FR' });
        expect(flagsClient.getBooleanDetails('test-flag', true).errorCode).toBe(
            ErrorCode.TARGETING_KEY_MISSING
        );
        await OpenFeature.clearContext();
        expect(flagsClient.getBooleanValue('boolean-flag', false)).toBe(true);
        alias.setConfiguration(rulesConfiguration());
        expect(flagsClient.getBooleanDetails('test-flag', true).errorCode).toBe(
            ErrorCode.TARGETING_KEY_MISSING
        );
        flagsClient.setEvaluationContextWithoutFetching({
            targetingKey: '',
            attributes: { country: 'CA' }
        });
        expect(OpenFeature.getClient().getBooleanValue('test-flag', true)).toBe(
            false
        );
        expect(NativeDdFlags.setEvaluationContext).not.toHaveBeenCalled();
    });

    it('evaluates string, number, and object rules and encodes their native tracking values', async () => {
        const configuration = rulesConfiguration();
        const response = configuration.rules.response;
        const base = response.flags['test-flag'];
        const stringIndex = response.strings.push('hello') - 1;
        const jsonIndex = response.jsonStrings.push('{"enabled":true}') - 1;
        // UFC variation types: STRING=1, NUMERIC=3, JSON=5. Round-trip the wire so the evaluator
        // rebuilds its prepared-rule indexes rather than relying on mutations to a prepared response.
        response.flags['string-flag'] = {
            ...base,
            variationType: 1,
            variations: base.variations.map(variation => ({
                ...variation,
                value: { case: 'stringValueIndex', value: stringIndex }
            }))
        };
        response.flags['number-flag'] = {
            ...base,
            variationType: 3,
            variations: base.variations.map(variation => ({
                ...variation,
                value: { case: 'numericValue', value: 3.14 }
            }))
        };
        response.flags['object-flag'] = {
            ...base,
            variationType: 5,
            variations: base.variations.map(variation => ({
                ...variation,
                value: { case: 'jsonStringIndex', value: jsonIndex }
            }))
        };
        const { provider, name } = setup(
            coreConfigurationFromString(configurationToString(configuration))
        );
        await OpenFeature.setProviderAndWait(provider, matchingContext);
        const client = OpenFeature.getClient();
        expect(client.getStringValue('string-flag', 'default')).toBe('hello');
        expect(client.getNumberValue('number-flag', 0)).toBe(3.14);
        expect(client.getObjectValue('object-flag', {})).toEqual({
            enabled: true
        });
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledTimes(3);
        for (const [key, type, value] of [
            ['string-flag', 'string', 'hello'],
            ['number-flag', 'number', '3.14'],
            ['object-flag', 'object', '{"enabled":true}']
        ]) {
            expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledWith(
                name,
                key,
                expect.objectContaining({
                    variationType: type,
                    variationValue: value,
                    doLog: true
                }),
                'user-1',
                { country: 'US' }
            );
        }
    });

    it('uses matching precomputed data first and falls back to rules after a context change', async () => {
        const configuration = {
            ...rulesConfiguration(),
            ...precomputedConfiguration()
        };
        const original = JSON.stringify(configuration, (_key, value) =>
            typeof value === 'bigint' ? String(value) : value
        );
        const { provider } = setup(configuration);
        await OpenFeature.setProviderAndWait(provider);
        const client = OpenFeature.getClient();
        expect(client.getStringValue('string-flag', 'default')).toBe('hello');
        expect(client.getBooleanDetails('test-flag', false).errorCode).toBe(
            ErrorCode.FLAG_NOT_FOUND
        );
        await OpenFeature.setContext({
            targetingKey: 'other-user',
            country: 'US'
        });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('test-flag', false)).toBe(true);
        await OpenFeature.clearContext();
        expect(client.getStringValue('string-flag', 'default')).toBe('hello');
        expect(
            JSON.stringify(configuration, (_key, value) =>
                typeof value === 'bigint' ? String(value) : value
            )
        ).toBe(original);
    });

    it('adopts a replacement snapshot context, while explicit overrides remain authoritative', async () => {
        const { provider } = setup(precomputedConfiguration());
        await OpenFeature.setProviderAndWait(provider);
        const replacement = precomputedConfiguration();
        replacement.precomputed.context = { targetingKey: 'user-2' };
        provider.setConfiguration(replacement);
        const client = OpenFeature.getClient();
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        expect(NativeDdFlags.trackEvaluation).toHaveBeenLastCalledWith(
            expect.any(String),
            'boolean-flag',
            expect.any(Object),
            'user-2',
            {}
        );
        await OpenFeature.setContext(matchingContext);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        await OpenFeature.clearContext();
        expect(client.providerStatus).toBe(ProviderStatus.READY);
    });

    it('normalizes both embedded and active contexts and preserves legacy tracking metadata', async () => {
        const configuration = precomputedConfiguration();
        configuration.precomputed.context = {
            ...matchingContext,
            nested: { ignored: true }
        };
        const flag =
            configuration.precomputed.response.data.attributes.flags[
                'boolean-flag'
            ];
        Object.assign(flag, { extraLogging: { source: 'legacy' } });
        const { provider, name } = setup(configuration);
        await OpenFeature.setProviderAndWait(provider, {
            ...matchingContext,
            nested: { different: true }
        });
        expect(
            OpenFeature.getClient().getBooleanValue('boolean-flag', false)
        ).toBe(true);
        expect(NativeDdFlags.trackEvaluation).toHaveBeenLastCalledWith(
            name,
            'boolean-flag',
            expect.objectContaining({ extraLogging: { source: 'legacy' } }),
            'user-1',
            { country: 'US' }
        );
    });

    it('preserves integer/float aliases and skips malformed individual precomputed flags', async () => {
        const configuration = precomputedConfiguration();
        Object.assign(
            configuration.precomputed.response.data.attributes.flags[
                'number-flag'
            ],
            { variationType: 'float' }
        );
        Object.assign(
            configuration.precomputed.response.data.attributes.flags[
                'boolean-flag'
            ],
            { doLog: 'invalid' }
        );
        const { provider } = setup(configuration);
        await OpenFeature.setProviderAndWait(provider);
        const client = OpenFeature.getClient();
        expect(client.getNumberValue('number-flag', 0)).toBe(3.14);
        expect(client.getBooleanDetails('boolean-flag', false).errorCode).toBe(
            ErrorCode.FLAG_NOT_FOUND
        );
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledTimes(1);
        expect(
            NativeDdFlags.trackEvaluation
        ).toHaveBeenLastCalledWith(
            expect.any(String),
            'number-flag',
            expect.objectContaining({ variationType: 'float' }),
            'user-1',
            { country: 'US' }
        );
    });

    it('does not track defaults or type mismatches and retains GENERAL for invalid precomputed input', async () => {
        const { provider } = setup(precomputedConfiguration());
        await OpenFeature.setProviderAndWait(provider);
        const client = OpenFeature.getClient();
        expect(client.getBooleanDetails('missing', true).errorCode).toBe(
            ErrorCode.FLAG_NOT_FOUND
        );
        expect(
            client.getStringDetails('boolean-flag', 'default').errorCode
        ).toBe(ErrorCode.TYPE_MISMATCH);
        provider.setConfiguration({});
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('boolean-flag', false).errorCode).toBe(
            ErrorCode.GENERAL
        );
        expect(NativeDdFlags.trackEvaluation).not.toHaveBeenCalled();
    });

    it('recovers from malformed rules, supports replacement rules, and only emits one configuration event', async () => {
        const { provider } = setup({ rulesError: 'Malformed rules' });
        await expect(
            OpenFeature.setProviderAndWait(provider, matchingContext)
        ).rejects.toMatchObject({ code: ErrorCode.GENERAL });
        const changed = jest.fn();
        provider.events.addHandler(
            ProviderEvents.ConfigurationChanged,
            changed
        );
        provider.setConfiguration(coreConfigurationFromString(rulesWire));
        const client = OpenFeature.getClient();
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('test-flag', false)).toBe(true);
        expect(changed).toHaveBeenCalledTimes(1);
        const replacement = rulesConfiguration();
        replacement.rules.response.flags['test-flag'].variations[0].value = {
            case: 'booleanValue',
            value: false
        };
        provider.setConfiguration(
            coreConfigurationFromString(configurationToString(replacement))
        );
        expect(client.getBooleanValue('test-flag', true)).toBe(false);
        expect(changed).toHaveBeenCalledTimes(2);
    });

    it('keeps usable rules when the precomputed branch is unsupported or malformed', async () => {
        const configuration = {
            ...rulesConfiguration(),
            ...precomputedConfiguration()
        };
        Object.assign(configuration.precomputed.response.data.attributes, {
            obfuscated: true
        });
        const { provider } = setup(configuration);
        await OpenFeature.setProviderAndWait(provider, matchingContext);
        expect(
            OpenFeature.getClient().getBooleanValue('test-flag', false)
        ).toBe(true);
    });

    it('shares configuration with providers/native getters using the same clientName, but isolates other clients', async () => {
        const { provider, name, flagsClient } = setup(rulesConfiguration());
        const sameClientProvider = new DatadogOfflineOpenFeatureProvider({
            clientName: name
        });
        const other = setup(precomputedConfiguration());
        await provider.initialize(matchingContext);
        expect(
            sameClientProvider.resolveBooleanEvaluation(
                'test-flag',
                false,
                {},
                logger
            ).value
        ).toBe(true);
        expect(flagsClient.getBooleanValue('test-flag', false)).toBe(true);
        sameClientProvider.setConfiguration({});
        expect(
            provider.resolveBooleanEvaluation('test-flag', false, {}, logger)
                .errorCode
        ).toBe(ErrorCode.GENERAL);
        expect(other.flagsClient.getBooleanValue('boolean-flag', false)).toBe(
            true
        );
    });

    it('discards delegated rules before an online fetch, including when that fetch fails', async () => {
        const { flagsClient } = setup(rulesConfiguration());
        flagsClient.setEvaluationContextWithoutFetching({
            targetingKey: 'user-1',
            attributes: { country: 'US' }
        });
        expect(flagsClient.getBooleanValue('test-flag', false)).toBe(true);
        jest.mocked(NativeDdFlags.setEvaluationContext).mockRejectedValueOnce(
            new Error('fetch failed')
        );
        await expect(
            flagsClient.setEvaluationContext({ targetingKey: 'user-2' })
        ).rejects.toThrow('fetch failed');
        expect(flagsClient.getBooleanValue('test-flag', false)).toBe(false);
    });

    it('allows a direct native configuration load to replace the delegate and a later provider load to restore it', () => {
        const { provider, flagsClient } = setup(rulesConfiguration());
        flagsClient.setConfiguration(
            configurationFromString(
                configurationToString(precomputedConfiguration())
            )
        );
        expect(flagsClient.getStringValue('string-flag', 'default')).toBe(
            'hello'
        );
        provider.setConfiguration(rulesConfiguration());
        flagsClient.setEvaluationContextWithoutFetching({
            targetingKey: 'user-1',
            attributes: { country: 'US' }
        });
        expect(flagsClient.getBooleanValue('test-flag', false)).toBe(true);
    });

    it('logs native tracking failures without changing the evaluated result', async () => {
        const log = jest.spyOn(InternalLog, 'log');
        const { flagsClient } = setup(precomputedConfiguration());
        jest.mocked(NativeDdFlags.trackEvaluation).mockRejectedValueOnce(
            new Error('tracking failed')
        );
        expect(flagsClient.getBooleanValue('boolean-flag', false)).toBe(true);
        await Promise.resolve();
        expect(log).toHaveBeenCalledWith(
            'Error tracking flag evaluation: tracking failed',
            expect.anything()
        );
    });
});
