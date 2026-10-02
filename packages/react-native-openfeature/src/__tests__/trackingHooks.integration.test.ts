/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { OpenFeature } from '@openfeature/web-sdk';

// Exercise the public exports, the real evaluator, and the real OpenFeature hook lifecycle.
import {
    composeDatadogTrackingHooks,
    coreConfigurationFromString,
    createDatadogEvaluationLoggingHook,
    createDatadogExposureLoggingHook,
    createDatadogRumTrackingHook,
    DatadogCoreProvider
} from '../rules-based';

import {
    matchingContext,
    precomputedConfiguration,
    rulesWire
} from './__utils__/coreConfiguration';

const mockAddFeatureFlagEvaluation = jest.fn((_name: string, _value: unknown) =>
    Promise.resolve()
);

jest.mock('@datadog/mobile-react-native', () => ({
    DdRum: {
        addFeatureFlagEvaluation: (name: string, value: unknown) =>
            mockAddFeatureFlagEvaluation(name, value)
    }
}));

const DOMAIN = 'datadog-core-tracking-test';

const sentEvents = (trackType: string): Array<Record<string, unknown>> =>
    (globalThis.fetch as jest.Mock).mock.calls
        .filter(([url]) => url.includes(`/api/v2/${trackType}?`))
        .flatMap(([, init]) =>
            (init.body as string).split('\n').map(line => JSON.parse(line))
        );

describe('Datadog tracking hooks with DatadogCoreProvider', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn(() => Promise.resolve({} as Response));
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext(DOMAIN);
        OpenFeature.clearHooks();
        jest.clearAllMocks();
    });

    it('tracks rules-based evaluations without DdFlags', async () => {
        const tracking = composeDatadogTrackingHooks(
            createDatadogExposureLoggingHook({
                clientToken: 'client-token',
                service: 'shop'
            }),
            createDatadogEvaluationLoggingHook({ clientToken: 'client-token' }),
            createDatadogRumTrackingHook()
        );
        await tracking.initialize();

        const provider = new DatadogCoreProvider();
        provider.setConfiguration(coreConfigurationFromString(rulesWire));
        await OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext);
        const client = OpenFeature.getClient(DOMAIN);
        client.addHooks(...tracking.hooks);

        expect(client.getBooleanValue('test-flag', false)).toBe(true);
        expect(client.getBooleanValue('test-flag', false)).toBe(true);
        await tracking.shutdown();

        expect(sentEvents('exposures')).toEqual([
            expect.objectContaining({
                allocation: { key: 'allocation' },
                flag: { key: 'test-flag' },
                variant: { key: 'on' },
                subject: { id: 'user-1', attributes: { country: 'US' } },
                service: 'shop'
            })
        ]);
        expect(sentEvents('flagevaluation')).toEqual([
            expect.objectContaining({
                flag: { key: 'test-flag' },
                variant: { key: 'on' },
                evaluation_count: 2
            })
        ]);
        expect(mockAddFeatureFlagEvaluation).toHaveBeenCalledTimes(2);
        expect(mockAddFeatureFlagEvaluation).toHaveBeenCalledWith(
            'test-flag',
            'on'
        );
    });

    it('tracks evaluations of flags that do not exist', async () => {
        const tracking = createDatadogEvaluationLoggingHook({
            clientToken: 'client-token'
        });
        await tracking.initialize();

        const provider = new DatadogCoreProvider();
        provider.setConfiguration(coreConfigurationFromString(rulesWire));
        await OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext);
        const client = OpenFeature.getClient(DOMAIN);
        client.addHooks(...tracking.hooks);

        const details = client.getBooleanDetails('missing-flag', false);
        await tracking.shutdown();

        expect(details.errorCode).toBe('FLAG_NOT_FOUND');
        expect(sentEvents('flagevaluation')).toEqual([
            expect.objectContaining({
                flag: { key: 'missing-flag' },
                evaluation_count: 1,
                runtime_default_used: true,
                error: { message: expect.any(String) }
            })
        ]);
    });

    it('sends the exposure again after the configuration is replaced', async () => {
        const tracking = createDatadogExposureLoggingHook({
            clientToken: 'client-token'
        });
        await tracking.initialize();

        const provider = new DatadogCoreProvider();
        provider.setConfiguration(precomputedConfiguration());
        await OpenFeature.setProviderAndWait(DOMAIN, provider, matchingContext);
        const client = OpenFeature.getClient(DOMAIN);
        client.addHooks(...tracking.hooks);

        client.getBooleanValue('boolean-flag', false);
        client.getBooleanValue('boolean-flag', false);
        // Same assignment, different flag value: the configuration has a new identity.
        const replacement = precomputedConfiguration();
        replacement.precomputed.response.data.attributes.flags[
            'boolean-flag'
        ].variationValue = false;
        provider.setConfiguration(replacement);
        client.getBooleanValue('boolean-flag', true);
        await tracking.shutdown();

        expect(sentEvents('exposures')).toHaveLength(2);
    });
});
