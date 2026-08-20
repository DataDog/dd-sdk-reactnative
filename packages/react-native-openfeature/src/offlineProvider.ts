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
    ParseError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    OpenFeatureError,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider } from './coreProvider';
import { toDdContextPreservingTargetingKey } from './mappers';

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
    PARSE_ERROR: ErrorCode.PARSE_ERROR,
    GENERAL: ErrorCode.GENERAL
};

/**
 * An offline Datadog OpenFeature provider.
 *
 * It behaves like the online `DatadogOpenFeatureProvider` — same flag evaluation and
 * exposure/RUM tracking — **except it never fetches configuration from the network**.
 * Instead of fetching on `initialize`/`onContextChange`, it evaluates against a configuration
 * supplied via {@link DatadogOfflineOpenFeatureProvider.setConfiguration}.
 * Supply a configuration parsed from the complete portable JSON envelope. The provider does not
 * accept a raw UFC protobuf response and does not build the envelope.
 *
 * A rules configuration evaluates each new context locally. Call `OpenFeature.setContext` to
 * change the subject. The provider does not fetch after this call.
 *
 * A precomputed configuration is a single-context snapshot. A different runtime context cannot
 * use that snapshot. If no rules fallback exists, the provider enters the OpenFeature `ERROR`
 * state and evaluations return coded defaults with `INVALID_CONTEXT`. An empty context is a real
 * context; it does not select the embedded context. Use `getPrecomputedContext` to get a supported
 * copy of the embedded context, and set it on OpenFeature before provider registration.
 *
 * A configuration can contain both branches. Matching precomputed data has priority. Rules data
 * is the fallback for a different context. Load the configuration before you set the provider:
 *
 * @example
 * ```ts
 * import { OpenFeature } from '@openfeature/web-sdk';
 * import {
 *     DatadogOfflineOpenFeatureProvider,
 *     configurationFromString,
 *     getPrecomputedContext
 * } from '@datadog/mobile-react-native-openfeature';
 *
 * const configuration = configurationFromString(wire);
 * const context = getPrecomputedContext(configuration);
 * if (context !== undefined) {
 *     await OpenFeature.setContext(context);
 * }
 *
 * const provider = new DatadogOfflineOpenFeatureProvider();
 * provider.setConfiguration(configuration); // no network
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

    protected readonly useResolutionContext = true;

    // OpenFeature supplies the effective context during initialization. Until then,
    // setConfiguration must only store the configuration: there is no real context
    // against which the provider can validate it or emit lifecycle events.
    private context: OFEvaluationContext | undefined;

    // Whether the provider is currently in an error state, so a successful `setConfiguration` must
    // emit `PROVIDER_READY` to recover (a bare `CONFIGURATION_CHANGED` would not clear `ERROR`).
    // It may be set before the provider is registered, so it does not necessarily mirror
    // OpenFeature's status yet.
    private configurationInError = false;

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        this.context = context;
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
        this.context = newContext;
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
     * @param configuration A configuration parsed from a complete portable
     * `FlagsConfigurationWire` JSON envelope via `configurationFromString`. The provider does not
     * fetch a UFC service response or construct this envelope.
     */
    setConfiguration(configuration: ParsedFlagsConfiguration): void {
        const result = this.flagsClient.setConfiguration(configuration);

        // Match the browser offline provider: configuration can be supplied before
        // registration, but validation and lifecycle events wait for initialize(),
        // when OpenFeature provides the effective context.
        if (this.context === undefined) {
            return;
        }

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
        // OpenFeature gives the provider only the effective context. It uses `{}` for an unset or
        // cleared global context, so the provider must treat `{}` as the real effective context.
        const result = this.flagsClient.setEvaluationContextWithoutFetching(
            toDdContextPreservingTargetingKey(context)
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
            case 'PARSE_ERROR':
                return new ParseError(
                    'The Datadog offline provider cannot parse the loaded configuration.'
                );
            default:
                return new GeneralError(
                    'The Datadog offline provider cannot serve the loaded configuration.'
                );
        }
    }
}
