/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    FlagsClient,
    ParsedFlagsConfiguration
} from '@datadog/mobile-react-native';
import { ProviderEvents } from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider } from './coreProvider';
import { isEmptyContext, toDdContext } from './mappers';

// The outcome of a `FlagsClient` reconcile. Kept internal (not part of the package's public
// API) — derived from the client so the provider maps it to OpenFeature events.
type ConfigurationOutcome = ReturnType<FlagsClient['setConfiguration']>;

/**
 * An offline Datadog OpenFeature provider.
 *
 * It behaves like the online `DatadogOpenFeatureProvider` — same flag evaluation and
 * exposure/RUM tracking — **except it never fetches configuration from the network**.
 * Instead of fetching on `initialize`/`onContextChange`, it evaluates against a configuration
 * supplied via {@link DatadogOfflineOpenFeatureProvider.setConfiguration}. A precomputed
 * configuration carries the evaluation context it was computed for, so you do not need to call
 * `OpenFeature.setContext` for the offline precomputed flow.
 *
 * Load the configuration before setting the provider so the provider is ready with real flag
 * values from the start:
 *
 * @example
 * ```ts
 * import { OpenFeature } from '@openfeature/web-sdk';
 * import {
 *     DatadogOfflineOpenFeatureProvider,
 *     configurationFromString
 * } from '@datadog/mobile-react-native-openfeature';
 *
 * const provider = new DatadogOfflineOpenFeatureProvider();
 * provider.setConfiguration(configurationFromString(wire)); // no network
 * await OpenFeature.setProviderAndWait(provider);
 *
 * const client = OpenFeature.getClient();
 * const enabled = client.getBooleanValue('new-feature', false);
 * ```
 */
export class DatadogOfflineOpenFeatureProvider extends DatadogCoreOpenFeatureProvider {
    readonly metadata: ProviderMetadata = {
        name: 'datadog-react-native-offline'
    };

    private hasEmittedError = false;

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        this.applyContext(context);
    }

    async onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): Promise<void> {
        this.applyContext(newContext);
    }

    /**
     * Load a configuration into the provider for offline evaluation.
     *
     * @param configuration A configuration parsed from a `ConfigurationWire` string via
     * `configurationFromString`.
     */
    setConfiguration(configuration: ParsedFlagsConfiguration): void {
        const outcome = this.flagsClient.setConfiguration(configuration);
        this.emitConfigurationOutcome(outcome);
    }

    private applyContext(context: OFEvaluationContext): void {
        // Do not overwrite the configuration's embedded context with an empty context stamped
        // by the OpenFeature lifecycle (e.g. `initialize({})` on `setProviderAndWait`). Only a
        // context the app actually set should take effect.
        if (isEmptyContext(context)) {
            return;
        }

        const outcome = this.flagsClient.setEvaluationContextWithoutFetching(
            toDdContext(context)
        );
        this.emitConfigurationOutcome(outcome);
    }

    private emitConfigurationOutcome(outcome: ConfigurationOutcome): void {
        if (outcome === 'ready') {
            if (this.hasEmittedError) {
                // Recover from a prior error state: emit READY to clear the provider status
                // (a bare CONFIGURATION_CHANGED would not clear it).
                this.hasEmittedError = false;
                this.events.emit(ProviderEvents.Ready);
            } else {
                // The provider is already READY from initialize; a (re)loaded configuration is
                // signalled as a configuration change.
                this.events.emit(ProviderEvents.ConfigurationChanged);
            }
        } else if (outcome === 'invalid') {
            this.hasEmittedError = true;
            this.events.emit(ProviderEvents.Error, {
                message:
                    'The Datadog offline provider cannot serve the loaded configuration (invalid).'
            });
        }
        // 'none' — no configuration engaged yet; nothing to signal. A runtime context that
        // does not match a precomputed snapshot is not an error: the client ignores it
        // (serving the snapshot for its embedded context) and warns.
    }
}
