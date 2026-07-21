/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    FlagsClient,
    ParsedFlagsConfiguration
} from '@datadog/mobile-react-native';
import {
    ErrorCode,
    GeneralError,
    InvalidContextError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    OpenFeatureError,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider } from './coreProvider';
import { isEmptyContext, toDdContext } from './mappers';

// The outcome of a `FlagsClient` reconcile. Derived from the client so the provider maps it to
// OpenFeature transitions; not part of the package's public API.
type ConfigurationResult = ReturnType<FlagsClient['setConfiguration']>;
type ConfigurationErrorCode = Extract<
    ConfigurationResult,
    { status: 'error' }
>['errorCode'];

// A `PROVIDER_ERROR` event payload carrying the spec's top-level error code (§5.1.5). The web-sdk
// `ErrorEvent` type omits `errorCode`, but the emitter accepts the extra field and
// `ProviderWrapper` reads it.
type ProviderErrorEvent = { message: string; errorCode: ErrorCode };

const OF_ERROR_CODE: Record<ConfigurationErrorCode, ErrorCode> = {
    INVALID_CONTEXT: ErrorCode.INVALID_CONTEXT,
    PROVIDER_NOT_READY: ErrorCode.PROVIDER_NOT_READY,
    GENERAL: ErrorCode.GENERAL
};

/**
 * An offline Datadog OpenFeature provider.
 *
 * It behaves like the online `DatadogOpenFeatureProvider` — same flag evaluation and
 * exposure/RUM tracking — **except it never fetches configuration from the network**.
 * Instead of fetching on `initialize`/`onContextChange`, it evaluates against a configuration
 * supplied via {@link DatadogOfflineOpenFeatureProvider.setConfiguration}. A precomputed
 * configuration carries the evaluation context it was computed for, so you should **not** call
 * `OpenFeature.setContext` for the offline precomputed flow — see the class remarks.
 *
 * A runtime context that is not deep-equal to the configuration's embedded context cannot be
 * served (offline never fetches), so it puts the provider into the OpenFeature `ERROR` state and
 * evaluations fall back to your coded defaults (`INVALID_CONTEXT`). Clearing or omitting context
 * re-adopts the embedded context and recovers. Load the configuration before setting the provider
 * so it is ready with real flag values from the start:
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

    // Whether the provider is currently in an error state, so a successful `setConfiguration` must
    // emit `PROVIDER_READY` to recover (a bare `CONFIGURATION_CHANGED` would not clear `ERROR`).
    // It may be set before the provider is registered, so it does not necessarily mirror
    // OpenFeature's status yet.
    private configurationInError = false;

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        const result = this.applyContext(context);

        // OpenFeature derives the initial status from whether `initialize` settles: resolve =>
        // READY, reject => ERROR. Reject when the provider cannot serve — an absent, invalid, or
        // context-mismatched configuration — so it does not start in a misleading READY that only
        // returns default values. Loading a valid configuration later recovers it.
        if (result.status === 'error') {
            throw this.toError(result.errorCode);
        }
    }

    onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): void {
        // Synchronous on purpose. Reconciliation is synchronous, and a synchronous throw makes the
        // Web SDK transition straight to ERROR (skipping the transient RECONCILING state) with no
        // async window in which an interleaved `setConfiguration` could clobber the final status.
        // Returning normally lets the Web SDK set READY — the automatic recovery path.
        const result = this.applyContext(newContext);

        if (result.status === 'error') {
            throw this.toError(result.errorCode);
        }
    }

    /**
     * Load a configuration into the provider for offline evaluation.
     *
     * @param configuration A configuration parsed from a `ConfigurationWire` string via
     * `configurationFromString`.
     */
    setConfiguration(configuration: ParsedFlagsConfiguration): void {
        const result = this.flagsClient.setConfiguration(configuration);

        if (result.status === 'ready') {
            if (this.configurationInError) {
                // Recover from a prior error: PROVIDER_READY clears the ERROR status (a bare
                // CONFIGURATION_CHANGED would not).
                this.configurationInError = false;
                this.events.emit(ProviderEvents.Ready);
            }
            // The (re)loaded configuration changed the served flags.
            this.events.emit(ProviderEvents.ConfigurationChanged);
        } else {
            this.configurationInError = true;
            const details: ProviderErrorEvent = {
                message:
                    'The Datadog offline provider cannot serve the loaded configuration for the current context.',
                errorCode: OF_ERROR_CODE[result.errorCode]
            };
            this.events.emit(ProviderEvents.Error, details);
        }
    }

    private applyContext(context: OFEvaluationContext): ConfigurationResult {
        // An empty context means "no external override": clear it so a loaded precomputed
        // configuration is served against its embedded context. Order-independent — the synthetic
        // `initialize({})`, `setContext({})`, and `clearContext()` all re-adopt the embedded
        // context rather than being treated as a mismatch.
        const result = isEmptyContext(context)
            ? this.flagsClient.resetEvaluationContextWithoutFetching()
            : this.flagsClient.setEvaluationContextWithoutFetching(
                  toDdContext(context)
              );

        this.configurationInError = result.status === 'error';

        return result;
    }

    /**
     * Map a reconcile error code to the precise OpenFeature error type, so direct callers of
     * `initialize`/`onContextChange` (and `setProviderAndWait`) receive the correct typed error.
     * (Web SDK 1.8.0 drops the code from the lifecycle-generated error *event*, but the thrown
     * error type is still accurate for callers.)
     */
    private toError(errorCode: ConfigurationErrorCode): OpenFeatureError {
        switch (errorCode) {
            case 'INVALID_CONTEXT':
                return new InvalidContextError(
                    'The evaluation context does not match the offline precomputed configuration. Serving default values.'
                );
            case 'PROVIDER_NOT_READY':
                return new ProviderNotReadyError(
                    'The Datadog offline provider has no configuration loaded. Provide one via setConfiguration.'
                );
            default:
                return new GeneralError(
                    'The Datadog offline provider cannot serve the loaded configuration.'
                );
        }
    }
}
