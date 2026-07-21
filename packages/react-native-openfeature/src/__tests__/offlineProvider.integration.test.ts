/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Integration test: exercises the offline provider against the REAL core FlagsClient (no mock of
// @datadog/mobile-react-native) AND through the REAL OpenFeature Web SDK lifecycle, so the actual
// configuration parse, context reconcile, provider-status transitions, and evaluation-detail
// mapping run. Assertions read the SDK's provider status (the status-overwrite bug is only visible
// end to end), the evaluation error code, and served values. Only the native TurboModule is stubbed
// (it is unavailable under jest) so ready-state evaluation can track exposures without throwing.

import { configurationFromString } from '@datadog/mobile-react-native';
import { ErrorCode, OpenFeature, ProviderStatus } from '@openfeature/web-sdk';

import { DatadogOfflineOpenFeatureProvider } from '../offlineProvider';

// Stub the native flags TurboModule (TurboModuleRegistry.get returns null under jest), so
// ready-state evaluation can call trackEvaluation without throwing.
jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    }
}));

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
        // Reset the global context so a context set by one test does not leak into the next.
        await OpenFeature.clearContext();
    });

    it('is READY when a matching configuration is loaded before registration', async () => {
        const { domain, clientName } = freshNames();
        const provider = new DatadogOfflineOpenFeatureProvider({ clientName });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));

        await OpenFeature.setProviderAndWait(domain, provider);

        const client = OpenFeature.getClient(domain);
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
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
        // Serving the coded default, with the precise error code.
        const details = client.getBooleanDetails('new-feature', false);
        expect(details.value).toBe(false);
        expect(details.errorCode).toBe(ErrorCode.INVALID_CONTEXT);

        // Setting the matching context again recovers automatically and serves the retained value.
        await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
        expect(client.providerStatus).toBe(ProviderStatus.READY);
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
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

        // clearContext(domain) falls back to the empty global context; empty means "no override", so
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
        expect(client.getBooleanValue('new-feature', false)).toBe(true);
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

    describe('domain / global-context isolation', () => {
        it('inherits a mismatching global context when the domain has none, entering ERROR', async () => {
            const { domain, clientName } = freshNames();
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(
                configurationFromString(wireFor('user-123'))
            );

            // A global (non-domain) context is set; the domain has no context of its own, so it
            // inherits the global one at registration → mismatch → ERROR.
            await OpenFeature.setContext({ targetingKey: 'global-user' });
            await expect(
                OpenFeature.setProviderAndWait(domain, provider)
            ).rejects.toThrow();

            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.ERROR
            );
        });

        it('ignores later global context changes once the domain has an explicit empty context', async () => {
            const { domain, clientName } = freshNames();
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(
                configurationFromString(wireFor('user-123'))
            );
            await OpenFeature.setProviderAndWait(domain, provider);

            // Give the domain its own (empty) context: this provider reads it as "no override".
            await OpenFeature.setContext(domain, {});
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );

            // A later mismatching GLOBAL context does not reach a domain that has its own context.
            await OpenFeature.setContext({ targetingKey: 'global-mismatch' });
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );
        });

        it('falls back to a mismatching global context when the domain context is cleared', async () => {
            const { domain, clientName } = freshNames();
            const provider = new DatadogOfflineOpenFeatureProvider({
                clientName
            });
            provider.setConfiguration(
                configurationFromString(wireFor('user-123'))
            );
            await OpenFeature.setProviderAndWait(domain, provider);

            await OpenFeature.setContext(domain, { targetingKey: 'user-123' });
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );

            // A mismatching global context does not reach the domain while it has its own context.
            await OpenFeature.setContext({ targetingKey: 'global-mismatch' });
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.READY
            );

            // Clearing the domain context falls back to the (mismatching) global context → ERROR.
            await OpenFeature.clearContext(domain);
            expect(OpenFeature.getClient(domain).providerStatus).toBe(
                ProviderStatus.ERROR
            );
        });
    });
});
