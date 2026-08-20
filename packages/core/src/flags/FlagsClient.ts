/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

// Imported directly (not via the module index): context matching is an internal helper,
// used here only to detect a runtime context an offline precomputed configuration cannot honor.
import { contextMatchesConfiguration } from './configuration/context';
import { decodePrecomputedFlags, normalizeWireContext } from './configuration';
import type {
    ParsedFlagsConfiguration,
    ParsedPrecomputedConfiguration
} from './configuration';
import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { JsonValue, EvaluationContext, FlagDetails } from './types';

/**
 * Error codes an offline configuration result can carry:
 * - `INVALID_CONTEXT`: the active context does not match the precomputed snapshot.
 * - `PROVIDER_NOT_READY`: an offline operation ran with no configuration loaded.
 * - `GENERAL`: the loaded configuration is unusable (malformed/unsupported/undecodable).
 */
export type ConfigurationErrorCode =
    | 'INVALID_CONTEXT'
    | 'PROVIDER_NOT_READY'
    | 'GENERAL';

/**
 * Outcome of loading a configuration or reconciling it against the active evaluation context,
 * returned by the offline APIs ({@link FlagsClient.setConfiguration},
 * {@link FlagsClient.setEvaluationContextWithoutFetching},
 * {@link FlagsClient.resetEvaluationContextWithoutFetching}).
 *
 * `'ready'` means the configuration can be served against the active context; `'error'` carries
 * the precise reason so the OpenFeature provider surfaces the correct code and evaluation returns
 * that code with the coded default.
 *
 * @internal Consumers observe OpenFeature provider events/evaluation details, not this result.
 */
export type ConfigurationResult =
    | { status: 'ready' }
    | { status: 'error'; errorCode: ConfigurationErrorCode };

/**
 * The decoded outcome of the last loaded offline configuration. Load validity (`kind`) is stored
 * separately from context compatibility so that later context changes reconcile against a decoded
 * snapshot **without re-decoding** and can never promote an invalid load to a servable state.
 *
 * `'none'` = no offline configuration engaged (the online/fetch path, or nothing loaded yet).
 */
type LoadedConfigurationState =
    | { kind: 'none' }
    | { kind: 'invalid'; errorCode: ConfigurationErrorCode }
    | {
          kind: 'precomputed';
          configuration: ParsedPrecomputedConfiguration;
          flags: Map<string, FlagCacheEntry>;
      };

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private clientName: string;

    // The context the app explicitly set — the online fetch context, or the offline override via
    // {@link setEvaluationContextWithoutFetching}. `undefined` means "no external override": an
    // offline precomputed configuration is then served against its own embedded context. Tracked
    // separately from {@link evaluationContext} so that adopting a configuration's embedded context
    // is never mistaken for an app-set override (which would spuriously fail a later replacement).
    private externalContext: EvaluationContext | undefined = undefined;

    // The effective context evaluation and exposure tracking run against: the external override
    // when set, otherwise the loaded configuration's embedded context.
    private evaluationContext: EvaluationContext | undefined = undefined;

    // The servable flag cache. On the online path it holds the native-fetched flags; on the
    // offline path it mirrors the decoded snapshot when the configuration is servable. A Map
    // (not a plain object) so a flag keyed like an inherited property ("toString",
    // "__proto__") is looked up as data via `.get()` and never resolves an `Object.prototype`
    // member — important now the cache can be fed from untrusted wire data.
    private flagsCache: Map<string, FlagCacheEntry> = new Map();

    // The decoded outcome of the last loaded offline configuration (see the type).
    private loadedConfiguration: LoadedConfigurationState = { kind: 'none' };

    // Internal serving status. `'none'` = online path (serve `flagsCache`); `'ready'` = serve
    // the offline snapshot; `'error'` = serve coded defaults with `configurationError`.
    private configurationStatus: 'none' | 'ready' | 'error' = 'none';

    private configurationError:
        | { errorCode: ConfigurationErrorCode; errorMessage: string }
        | undefined = undefined;

    constructor(clientName: string = 'default') {
        this.clientName = clientName;
    }

    /**
     * Sets the evaluation context for the client.
     *
     * Should be called before evaluating any flags. Otherwise, the client will fall back to serving default flag values.
     *
     * Throws an error if there is an error setting the evaluation context and logs an error message.
     *
     * @param context The evaluation context to associate with the current client.
     *
     * @example
     * ```ts
     * const flagsClient = DdFlags.getClient();
     *
     * await flagsClient.setEvaluationContext({
     *     targetingKey: 'user-123',
     *     attributes: {
     *         favoriteFruit: 'apple'
     *     }
     * });
     *
     * const flagValue = flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    setEvaluationContext = async (
        context: EvaluationContext
    ): Promise<void> => {
        // Make sure to process the incoming context because we don't support nested object values in context.
        const processedContext = processEvaluationContext(context);

        // Entering online mode drops any offline overlay *before* fetching, so a failed fetch falls
        // back to coded defaults rather than continuing to serve a stale offline snapshot. Using one
        // client for both online and offline is unsupported (give the offline provider its own
        // `clientName`), so warn when an offline configuration is discarded here. Online-only clients
        // have no overlay, so this does not touch their keep-last-known-flags-on-failure behavior.
        if (this.loadedConfiguration.kind !== 'none') {
            InternalLog.log(
                `An offline configuration was loaded for '${this.clientName}' but an online fetch was requested; discarding it and serving default values on failure. Use a separate client for the offline provider.`,
                SdkVerbosity.WARN
            );
            this.loadedConfiguration = { kind: 'none' };
            this.configurationStatus = 'none';
            this.configurationError = undefined;
            this.flagsCache = new Map();
            this.evaluationContext = undefined;
            this.externalContext = undefined;
        }

        try {
            const result = await this.nativeFlags.setEvaluationContext(
                this.clientName,
                processedContext.targetingKey,
                processedContext.attributes ?? {}
            );

            this.externalContext = processedContext;
            this.evaluationContext = processedContext;
            this.flagsCache = new Map(Object.entries(result));

            // A successful online fetch is authoritative: reset to the clean online state so a
            // prior offline error status (e.g. PROVIDER_NOT_READY from an offline op with no
            // configuration loaded) can't keep serving coded defaults over the fetched flags.
            this.loadedConfiguration = { kind: 'none' };
            this.configurationStatus = 'none';
            this.configurationError = undefined;
        } catch (error) {
            // A failed fetch leaves the previous online cache in place (keep-last-known); any offline
            // overlay was already dropped above, so no stale offline snapshot is served.
            if (error instanceof Error) {
                InternalLog.log(
                    `Error setting flag evaluation context: ${error.message}`,
                    SdkVerbosity.WARN
                );
            }

            throw error;
        }
    };

    /**
     * Set the evaluation context **without** fetching a configuration from the network, then
     * reconcile the loaded configuration against it.
     *
     * The offline counterpart to {@link setEvaluationContext}: records the active context and
     * reconciles with no native request. A precomputed configuration is single-subject, so a
     * context that does not match the one it was computed for reconciles to an error
     * (`INVALID_CONTEXT`) and evaluation serves defaults. With no configuration loaded the
     * result is `PROVIDER_NOT_READY`. Intended for offline providers that own their
     * configuration via `setConfiguration` and must not fetch on a context change.
     *
     * @param context The evaluation context to associate with the current client.
     */
    setEvaluationContextWithoutFetching = (
        context: EvaluationContext
    ): ConfigurationResult => {
        this.externalContext = processEvaluationContext(context);

        return this.reconcile();
    };

    /**
     * Clear any externally-set evaluation context and reconcile.
     *
     * This is an explicit low-level Datadog reset operation. It drops the external override so a
     * loaded precomputed configuration is served against **its embedded context** again. It does
     * not represent OpenFeature `clearContext()`, which supplies the resulting effective context
     * to a provider. With no configuration loaded the result is `PROVIDER_NOT_READY`.
     */
    resetEvaluationContextWithoutFetching = (): ConfigurationResult => {
        this.externalContext = undefined;

        return this.reconcile();
    };

    /**
     * Load a configuration (parsed from a `ConfigurationWire` string via
     * `configurationFromString`) into the client for offline evaluation, then reconcile it
     * against the active context.
     *
     * For a precomputed configuration this decodes the snapshot once and adopts its embedded
     * evaluation context when none is set — **no network request is made**. An unusable
     * configuration reconciles to an error (`GENERAL`); a context mismatch to `INVALID_CONTEXT`.
     *
     * @param configuration The configuration to load.
     *
     * @example
     * ```ts
     * const configuration = configurationFromString(wire);
     * flagsClient.setConfiguration(configuration);
     *
     * const value = flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    setConfiguration = (
        configuration: ParsedFlagsConfiguration
    ): ConfigurationResult => {
        this.loadedConfiguration = this.loadConfiguration(configuration);

        return this.reconcile();
    };

    /**
     * Decode a supplied configuration into a {@link LoadedConfigurationState} **once**, capturing
     * whether the load itself is valid (independent of the active context). Later context changes
     * reconcile against this stored state without re-decoding, and can never turn an invalid load
     * into a servable one.
     *
     * FORWARD-COMPAT SEAM: when a rules-based configuration is supported, it must be handled here
     * BEFORE the precomputed guard — rules are context-agnostic and must NOT be classified invalid.
     */
    private loadConfiguration = (
        configuration: ParsedFlagsConfiguration
    ): LoadedConfigurationState => {
        const precomputed = configuration?.precomputed;

        // An empty configuration (a failed/lenient wire parse, or a wire with no precomputed
        // branch) is unusable. `configurationFromString` collapses malformed input and
        // unsupported versions to the same empty shape, so this is classified as `GENERAL`.
        if (!precomputed) {
            InternalLog.log(
                `No usable precomputed configuration was provided for '${this.clientName}'.`,
                SdkVerbosity.WARN
            );
            return { kind: 'invalid', errorCode: 'GENERAL' };
        }

        try {
            const flags = decodePrecomputedFlags(precomputed.response);

            return { kind: 'precomputed', configuration: precomputed, flags };
        } catch (error) {
            // Decoding rejects unsupported payloads (e.g. obfuscated) — an unsupported kind,
            // classified as `GENERAL`.
            if (error instanceof Error) {
                InternalLog.log(
                    `Unsupported flags configuration for '${this.clientName}': ${error.message}`,
                    SdkVerbosity.WARN
                );
            }
            return { kind: 'invalid', errorCode: 'GENERAL' };
        }
    };

    /**
     * Reconcile the stored {@link LoadedConfigurationState} against the active evaluation context
     * and (re)compute the servable flag cache and configuration status/result.
     *
     * The stored load validity is consulted **before** context compatibility, so a context change
     * can never promote an invalid (or absent) load to `ready`.
     */
    private reconcile = (): ConfigurationResult => {
        const loaded = this.loadedConfiguration;

        // No offline configuration engaged: an offline operation with nothing loaded is not ready.
        if (loaded.kind === 'none') {
            return this.enterError(
                'PROVIDER_NOT_READY',
                `The evaluation context is not usable for '${this.clientName}': no configuration is loaded. Provide a configuration via setConfiguration.`
            );
        }

        // The load itself failed (malformed/unsupported/undecodable) — independent of context.
        if (loaded.kind === 'invalid') {
            return this.enterError(
                loaded.errorCode,
                `The loaded configuration for '${this.clientName}' is not usable. Provide a valid precomputed configuration.`
            );
        }

        const { configuration, flags } = loaded;

        // A precomputed snapshot is bound to the subject it was computed for. If the app set an
        // *external* context that does not match, it cannot be served (offline never fetches), so
        // it is an error and evaluation serves coded defaults. Only an external override is checked
        // here — the configuration's own embedded context (adopted below when no override is set)
        // matches by construction, so replacing one snapshot with another for a different subject
        // stays `ready`. The decoded snapshot is retained for a later matching context.
        if (
            this.externalContext &&
            !contextMatchesConfiguration(
                configuration.context,
                this.externalContext
            )
        ) {
            return this.enterError(
                'INVALID_CONTEXT',
                `The evaluation context does not match the precomputed configuration for '${this.clientName}'. Serving default values. Set a matching context, or use a rules-based configuration for per-context evaluation.`
            );
        }

        // Serve against the external override when set, otherwise the configuration's embedded
        // context (a context-agnostic configuration falls back to an empty context).
        this.evaluationContext =
            this.externalContext ?? this.embeddedContext(configuration);
        this.flagsCache = flags;
        this.configurationStatus = 'ready';
        this.configurationError = undefined;

        return { status: 'ready' };
    };

    /** The evaluation context a precomputed configuration was computed for (empty if agnostic). */
    private embeddedContext = (
        configuration: ParsedPrecomputedConfiguration
    ): EvaluationContext => {
        return configuration.context
            ? normalizeWireContext(configuration.context)
            : { targetingKey: '', attributes: {} };
    };

    /** Record an error status + message, clear the servable cache, and return the result. */
    private enterError = (
        errorCode: ConfigurationErrorCode,
        errorMessage: string
    ): ConfigurationResult => {
        this.flagsCache = new Map();
        this.configurationStatus = 'error';
        this.configurationError = { errorCode, errorMessage };
        InternalLog.log(errorMessage, SdkVerbosity.WARN);

        return { status: 'error', errorCode };
    };

    private track = (flag: FlagCacheEntry, context: EvaluationContext) => {
        // A non-blocking call; don't await this.
        this.nativeFlags
            .trackEvaluation(
                this.clientName,
                flag.key,
                flag,
                context.targetingKey,
                context.attributes ?? {}
            )
            .catch(error => {
                if (error instanceof Error) {
                    InternalLog.log(
                        `Error tracking flag evaluation: ${error.message}`,
                        SdkVerbosity.WARN
                    );
                }
            });
    };

    private getDetails = <T>(
        key: string,
        defaultValue: T,
        type: 'boolean' | 'string' | 'number' | 'object'
    ): FlagDetails<T> => {
        // An offline configuration that cannot be served against the active context surfaces the
        // precise error code (INVALID_CONTEXT / GENERAL / PROVIDER_NOT_READY) with the coded
        // default. The OpenFeature provider maps this to a PROVIDER_ERROR / ERROR state.
        if (this.configurationStatus === 'error' && this.configurationError) {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: this.configurationError.errorCode,
                errorMessage: this.configurationError.errorMessage
            };
        }

        if (!this.evaluationContext) {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: 'PROVIDER_NOT_READY',
                errorMessage: `The evaluation context is not set for '${this.clientName}'. Please, set context before evaluating any flags.`
            };
        }

        // Retrieve the flag from the cache.
        const flag = this.flagsCache.get(key);

        if (!flag) {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: 'FLAG_NOT_FOUND'
            };
        }

        // Validate the expected type against the actual flag value type.
        const actualType = typeof flag.value;
        if (actualType !== type) {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: 'TYPE_MISMATCH',
                errorMessage: `Flag "${key}" returned a value of type "${typeof flag.value}". Use the corresponding method instead of the one expecting "${type}".`
            };
        }

        this.track(flag, this.evaluationContext);

        const details: FlagDetails<T> = {
            key: flag.key,
            value: flag.value as T,
            variant: flag.variationKey,
            allocationKey: flag.allocationKey,
            reason: flag.reason
        };

        return details;
    };

    /**
     * Evaluate a boolean feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getBooleanDetails = (
        key: string,
        defaultValue: boolean
    ): FlagDetails<boolean> => {
        return this.getDetails(key, defaultValue, 'boolean');
    };

    /**
     * Evaluate a string feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getStringDetails = (
        key: string,
        defaultValue: string
    ): FlagDetails<string> => {
        return this.getDetails(key, defaultValue, 'string');
    };

    /**
     * Evaluate a number feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getNumberDetails = (
        key: string,
        defaultValue: number
    ): FlagDetails<number> => {
        return this.getDetails(key, defaultValue, 'number');
    };

    /**
     * Evaluate a JSON feature flag with detailed evaluation information.
     *
     * Even though the `defaultValue` is typed as `JsonValue`, the flag value should be a valid JSON object.
     * Please use other typed methods to evaluate flags with primitive values.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     */
    getObjectDetails = <T extends JsonValue>(
        key: string,
        defaultValue: T
    ): FlagDetails<T> => {
        return this.getDetails(key, defaultValue, 'object');
    };

    /**
     * Evaluate a boolean feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const isNewFeatureEnabled = flagsClient.getBooleanValue('new-feature-enabled', false);
     * ```
     */
    getBooleanValue = (key: string, defaultValue: boolean): boolean => {
        return this.getBooleanDetails(key, defaultValue).value;
    };

    /**
     * Evaluate a string feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const appTheme = flagsClient.getStringValue('app-theme', 'light');
     * ```
     */
    getStringValue = (key: string, defaultValue: string): string => {
        return this.getStringDetails(key, defaultValue).value;
    };

    /**
     * Evaluate a number feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const ctaButtonSize = flagsClient.getNumberValue('cta-button-size', 16);
     * ```
     */
    getNumberValue = (key: string, defaultValue: number): number => {
        return this.getNumberDetails(key, defaultValue).value;
    };

    /**
     * Evaluate an object feature flag value.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue Fallback value for when flag evaluation fails, flag is not found, or the client does not have an evaluation context set.
     *
     * @example
     * ```ts
     * const pageCalloutOptions = flagsClient.getObjectValue('page-callout', { color: 'purple', text: 'Woof!' });
     * ```
     */
    getObjectValue = <T extends JsonValue>(key: string, defaultValue: T): T => {
        return this.getObjectDetails(key, defaultValue).value;
    };
}
