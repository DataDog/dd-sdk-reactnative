/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Integration test: exercises the offline provider against the REAL core FlagsClient (no mock
// of @datadog/mobile-react-native), so the actual configuration parse + context reconcile run.
// It asserts via provider events only (no flag evaluation), so it needs no native module.

import { configurationFromString } from '@datadog/mobile-react-native';
import { ProviderEvents } from '@openfeature/web-sdk';

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

describe('DatadogOfflineOpenFeatureProvider (integration, real FlagsClient)', () => {
    it('adopts the config context after initialize({}) — regression for empty-context stamping', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider({
            clientName: 'offline-integration-adopt'
        });
        const emitSpy = jest.spyOn(provider.events, 'emit');

        // Empty OpenFeature context (as OpenFeature stamps on setProviderAndWait) must NOT
        // defeat the configuration's embedded context.
        await provider.initialize({});
        provider.setConfiguration(configurationFromString(wireFor('user-123')));

        // Before the fix this mismatched → PROVIDER_ERROR; now it serves → configuration change.
        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.ConfigurationChanged
        );
        expect(emitSpy).not.toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.anything()
        );
    });

    it('errors when an explicit context mismatches the config', async () => {
        const provider = new DatadogOfflineOpenFeatureProvider({
            clientName: 'offline-integration-mismatch'
        });
        const emitSpy = jest.spyOn(provider.events, 'emit');

        await provider.initialize({ targetingKey: 'someone-else' });
        provider.setConfiguration(configurationFromString(wireFor('user-123')));

        expect(emitSpy).toHaveBeenCalledWith(
            ProviderEvents.Error,
            expect.anything()
        );
    });
});
