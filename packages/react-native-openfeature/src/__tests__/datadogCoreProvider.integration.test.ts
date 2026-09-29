/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationToString } from '@datadog/flagging-core/rules-based';
import {
    ErrorCode,
    OpenFeature,
    ProviderEvents,
    ProviderStatus
} from '@openfeature/web-sdk';

// Exercise the public exports, the real pinned evaluator, and the real OpenFeature lifecycle.
import { coreConfigurationFromString, DatadogCoreProvider } from '../index';

import {
    matchingContext,
    precomputedConfiguration,
    rulesWire
} from './__utils__/coreConfiguration';

const DOMAIN = 'datadog-core-test';

const precomputedProvider = (): DatadogCoreProvider => {
    const provider = new DatadogCoreProvider();
    provider.setConfiguration(
        coreConfigurationFromString(
            configurationToString(precomputedConfiguration())
        )
    );
    return provider;
};

describe('DatadogCoreProvider with OpenFeature', () => {
    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext(DOMAIN);
        await OpenFeature.clearContext();
        OpenFeature.clearHandlers();
    });

    it('registers precomputed configuration and resolves every flag type without enabling DdFlags', async () => {
        await OpenFeature.setProviderAndWait(
            DOMAIN,
            precomputedProvider(),
            matchingContext
        );
        const client = OpenFeature.getClient(DOMAIN);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
        expect(client.getStringValue('string-flag', 'default')).toBe('hello');
        expect(client.getNumberValue('number-flag', 0)).toBe(3.14);
        expect(client.getObjectValue('object-flag', {})).toEqual({
            nested: { enabled: true },
            list: [1, 2]
        });
    });

    it('parses rules via the public helper and reevaluates when the OpenFeature context changes', async () => {
        const provider = new DatadogCoreProvider();
        provider.setConfiguration(coreConfigurationFromString(rulesWire));
        await OpenFeature.setProviderAndWait(DOMAIN, provider, {
            targetingKey: 'user-1',
            country: 'CA'
        });
        const client = OpenFeature.getClient(DOMAIN);
        expect(client.getBooleanDetails('test-flag', false)).toMatchObject({
            value: true,
            reason: 'SPLIT'
        });

        await OpenFeature.setContext(DOMAIN, matchingContext);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanDetails('test-flag', false)).toMatchObject({
            value: true,
            reason: 'TARGETING_MATCH'
        });
    });

    it('enters ERROR on mismatching or cleared contexts and recovers on a matching context', async () => {
        await OpenFeature.setProviderAndWait(
            DOMAIN,
            precomputedProvider(),
            matchingContext
        );
        const client = OpenFeature.getClient(DOMAIN);
        await OpenFeature.setContext(DOMAIN, { targetingKey: 'other' });
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('boolean-flag', false)).toMatchObject({
            value: false,
            errorCode: ErrorCode.INVALID_CONTEXT
        });

        await OpenFeature.setContext(DOMAIN, matchingContext);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);

        await OpenFeature.clearContext(DOMAIN);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('boolean-flag', false)).toMatchObject({
            value: false,
            errorCode: ErrorCode.INVALID_CONTEXT
        });
    });

    it('recovers from missing configuration via setConfiguration after initialization settles', async () => {
        const provider = new DatadogCoreProvider();
        await expect(
            OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext)
        ).rejects.toMatchObject({ code: ErrorCode.PROVIDER_NOT_READY });
        const client = OpenFeature.getClient(DOMAIN);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        provider.setConfiguration(precomputedConfiguration());
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
    });

    it('propagates parse errors from configuration replacement, then recovers and serves new values', async () => {
        const provider = precomputedProvider();
        await OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext);
        const client = OpenFeature.getClient(DOMAIN);
        const changed = jest.fn();
        client.addHandler(ProviderEvents.ConfigurationChanged, changed);
        provider.setConfiguration(coreConfigurationFromString('not json'));
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        expect(client.getBooleanDetails('boolean-flag', false)).toMatchObject({
            value: false,
            errorCode: ErrorCode.PARSE_ERROR
        });
        expect(changed).not.toHaveBeenCalled();

        const replacement = precomputedConfiguration();
        replacement.precomputed.response.data.attributes.flags[
            'string-flag'
        ].variationValue = 'updated';
        provider.setConfiguration(replacement);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getStringValue('string-flag', 'default')).toBe('updated');
        expect(changed).toHaveBeenCalledTimes(1);
    });

    it('recovers with a replacement matching the current context after a context error', async () => {
        const provider = precomputedProvider();
        await OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext);
        await OpenFeature.setContext(DOMAIN, { targetingKey: 'other' });
        const replacement = precomputedConfiguration();
        replacement.precomputed.context = { targetingKey: 'other' };
        provider.setConfiguration(replacement);
        const client = OpenFeature.getClient(DOMAIN);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
    });

    it('keeps providers in different domains independent', async () => {
        const otherDomain = 'datadog-core-other';
        const provider = precomputedProvider();
        const otherProvider = precomputedProvider();
        try {
            await OpenFeature.setProviderAndWait(
                DOMAIN,
                provider,
                matchingContext
            );
            await OpenFeature.setProviderAndWait(
                otherDomain,
                otherProvider,
                matchingContext
            );
            provider.setConfiguration({});
            expect(OpenFeature.getClient(DOMAIN).providerStatus).toBe(
                ProviderStatus.ERROR
            );
            expect(OpenFeature.getClient(otherDomain).providerStatus).toBe(
                ProviderStatus.READY
            );
            expect(
                OpenFeature.getClient(otherDomain).getBooleanValue(
                    'boolean-flag',
                    false
                )
            ).toBe(true);
        } finally {
            await OpenFeature.clearContext(otherDomain);
        }
    });
});
