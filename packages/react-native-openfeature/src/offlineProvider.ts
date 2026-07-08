/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    ConfigurationStatus,
    ParsedFlagsConfiguration
} from '@datadog/mobile-react-native';
import { ProviderEvents } from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider, toDdContext } from './coreProvider';

/**
 * An offline Datadog OpenFeature provider.
 *
 * It behaves exactly like {@link DatadogOpenFeatureProvider} — same flag evaluation and
 * exposure/RUM tracking — **except it never fetches configuration from the network**.
 * Instead of fetching on `initialize`/`onContextChange`, it records the context and
 * reconciles a configuration supplied via {@link setConfiguration}. Use it for offline
 * initialization: load a `ParsedFlagsConfiguration` (from `configurationFromString`) and
 * evaluate flags with no network request.
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
 * await OpenFeature.setProviderAndWait(provider);
 *
 * provider.setConfiguration(configurationFromString(wire));
 * const client = OpenFeature.getClient();
 * const enabled = client.getBooleanValue('new-feature', false);
 * ```
 */
export class DatadogOfflineOpenFeatureProvider extends DatadogCoreOpenFeatureProvider {
    readonly metadata: ProviderMetadata = {
        name: 'datadog-react-native-offline'
    };

    private hasServedConfiguration = false;

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        // Record the context and reconcile any loaded configuration — no network fetch.
        const status = this.flagsClient.setEvaluationContextWithoutFetching(
            toDdContext(context)
        );
        this.emitConfigurationOutcome(status);
    }

    async onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): Promise<void> {
        const status = this.flagsClient.setEvaluationContextWithoutFetching(
            toDdContext(newContext)
        );
        this.emitConfigurationOutcome(status);
    }

    /**
     * Load a configuration into the provider for offline evaluation.
     *
     * @param configuration A configuration parsed from a `ConfigurationWire` string via
     * `configurationFromString`.
     */
    setConfiguration(configuration: ParsedFlagsConfiguration): void {
        const status = this.flagsClient.setConfiguration(configuration);
        this.emitConfigurationOutcome(status);
    }

    private emitConfigurationOutcome(status: ConfigurationStatus): void {
        if (status === 'ready') {
            if (this.hasServedConfiguration) {
                this.events.emit(ProviderEvents.ConfigurationChanged);
            } else {
                this.hasServedConfiguration = true;
                this.events.emit(ProviderEvents.Ready);
            }
        } else if (status === 'mismatch' || status === 'invalid') {
            this.events.emit(ProviderEvents.Error, {
                message: `The Datadog offline provider cannot serve the loaded configuration (${status}).`
            });
        }
        // 'none' — no configuration engaged yet; nothing to signal.
    }
}
