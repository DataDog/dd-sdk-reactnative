/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Integration test: exercises the offline provider against the REAL core FlagsClient (no mock of
// @datadog/mobile-react-native) AND through the REAL OpenFeature Web SDK lifecycle, so the actual
// configuration parse, context reconcile, and provider-status transitions run. Assertions read
// the SDK's provider status (the status-overwrite bug is only visible end to end) and evaluate
// only in the ERROR state (which returns the coded default before any native tracking call), so
// no native module is required.

import { configurationFromString } from '@datadog/mobile-react-native';
import { OpenFeature, ProviderStatus } from '@openfeature/web-sdk';

import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

const wireFor = (targetingKey: string): string =>
    JSON.stringify({
        version: 1,
        precomputed: {
            response: JSON.stringify({
                data: {
                    attributes: {
                        obfuscated: false,
                        flags: {
                            'new-feature': {
                                variationType: 'boolean',
                                variationValue: true,
                                variationKey: 'true',
                                allocationKey: 'alloc-1',
                                reason: 'STATIC',
                                doLog: false,
                                extraLogging: {}
                            }
                        }
                    }
                }
            }),
            context: { targetingKey }
        }
    });

// A unique OpenFeature domain + Datadog clientName per test keeps providers isolated (separate
// domains otherwise share the same underlying FlagsClient).
let seq = 0;
const freshNames = () => {
    seq += 1;
    return { domain: `offline-int-${seq}`, clientName: `offline-int-${seq}` };
};

describe('DatadogOfflineOpenFeatureProvider (integration, real FlagsClient + OpenFeature)', () => {
    afterEach(async () => {
        await OpenFeature.clearProviders();
    });

    it('is READY when a matching configuration is loaded before registration', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));

        await OpenFeature.setProviderAndWait(domain, provider);

        expect(OpenFeature.getClient(domain).providerStatus).toBe(
            ProviderStatus.READY
        );
    });

    it('enters ERROR and serves defaults on a mismatching setContext, then recovers on a matching one', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));
        await OpenFeature.setProviderAndWait(domain, provider);

        // A runtime context that does not match the snapshot cannot be served.
        await OpenFeature.setContext(domain, { targetingKey: 'someone-else' });

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);
        // Serving the coded default (evaluated in the ERROR state — no native tracking).
        expect(client.getBooleanValue('new-feature', false)).toBe(false);

        // Setting the matching context again recovers automatically.
        await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
    });

    it('stays READY when the context is cleared (empty = re-adopt embedded)', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
        expect(OpenFeature.getClient(domain).providerStatus).toBe(
            ProviderStatus.READY
        );

        // clearContext() falls back to the empty global context; empty means "no override", so
        // the embedded context is re-adopted and the provider stays READY.
        await OpenFeature.clearContext(domain);
        expect(OpenFeature.getClient(domain).providerStatus).toBe(
            ProviderStatus.READY
        );
    });

    it('starts in ERROR when registered before any configuration, then recovers via setConfiguration', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });

        // Provider-first: initialize rejects (no usable configuration), so registration surfaces
        // an error and the provider is ERROR rather than a misleading READY.
        await expect(
            OpenFeature.setProviderAndWait(domain, provider)
        ).rejects.toThrow();
        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        // Loading a valid configuration recovers via the emitted PROVIDER_READY.
        provider.setConfiguration(configurationFromString(wireFor('user-123')));
        expect(client.providerStatus).toBe(ProviderStatus.READY);
    });

    it('recovers via setConfiguration when a config matching the current context is loaded', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));
        await OpenFeature.setProviderAndWait(domain, provider);

        await OpenFeature.setContext(domain, { targetingKey: 'someone-else' });
        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.ERROR);

        // Load a configuration computed for the now-current context: it reconciles to ready and
        // setConfiguration emits PROVIDER_READY.
        provider.setConfiguration(
            configurationFromString(wireFor('someone-else'))
        );
        expect(client.providerStatus).toBe(ProviderStatus.READY);
    });
});
