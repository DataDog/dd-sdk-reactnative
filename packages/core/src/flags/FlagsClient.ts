/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

// Imported directly (not via the module index): context matching is an internal helper,
// used here only to detect and warn about a runtime context that an offline precomputed
// configuration cannot honor.
import { contextMatchesConfiguration } from './configuration/context';
import { decodePrecomputedFlags, normalizeWireContext } from './configuration';
import type { ParsedFlagsConfiguration } from './configuration';
import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { JsonValue, EvaluationContext, FlagDetails } from './types';

/**
 * Tracks how a configuration supplied via {@link FlagsClient.setConfiguration} relates
 * to the active evaluation context. `'none'` means no offline configuration is engaged
 * (the online/fetch path is in effect).
 */
type ConfigurationStatus = 'none' | 'ready' | 'invalid';

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private clientName: string;

    private evaluationContext: EvaluationContext | undefined = undefined;

    private flagsCache: Record<string, FlagCacheEntry> = {};

    private loadedConfiguration:
        | ParsedFlagsConfiguration
        | undefined = undefined;

    private configurationStatus: ConfigurationStatus = 'none';

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

        try {
            const result = await this.nativeFlags.setEvaluationContext(
                this.clientName,
                processedContext.targetingKey,
                processedContext.attributes ?? {}
            );

            this.evaluationContext = processedContext;
            this.flagsCache = result;

            // An explicit online fetch supersedes any previously loaded offline
            // configuration, so drop the offline overlay to keep state coherent.
            //
            // PROVISIONAL: this reflects the current fetch-always default. When the
            // `NEVER` fetch policy lands, that path must skip the fetch and re-run
            // `applyConfiguration()` against the new context instead of dropping the
            // loaded configuration.
            this.loadedConfiguration = undefined;
            this.configurationStatus = 'none';
        } catch (error) {
            // NOTE: a failed fetch leaves any previously loaded offline configuration in
            // place, so the client may keep serving it (and attribute exposures to its
            // context). Fetch-failure/staleness fallback is deferred to the fetch-policy
            // step.
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
     * Set the evaluation context **without** fetching a configuration from the network,
     * then reconcile any configuration loaded via {@link setConfiguration} against it.
     *
     * This is the offline counterpart to {@link setEvaluationContext}: it records the
     * active context and re-evaluates the loaded configuration (context matching, for a
     * precomputed configuration) with no native request. It is intended for offline
     * providers that own their configuration via `setConfiguration` and must not fetch on
     * a context change. With no configuration loaded yet, the context is simply recorded.
     *
     * @param context The evaluation context to associate with the current client.
     */
    setEvaluationContextWithoutFetching = (
        context: EvaluationContext
    ): void => {
        this.evaluationContext = processEvaluationContext(context);

        // Re-evaluate a loaded offline configuration against the new context.
        if (this.loadedConfiguration) {
            this.applyConfiguration();
        } else {
            // No offline configuration is engaged: do not keep serving any previously
            // cached flags (e.g. from a prior online fetch) against the new context.
            this.flagsCache = {};
            this.configurationStatus = 'none';
        }
    };

    /**
     * Load a configuration (parsed from a `ConfigurationWire` string via
     * `configurationFromString`) into the client for offline evaluation.
     *
     * For a precomputed configuration this populates the flag cache and adopts the
     * configuration's embedded evaluation context — **no network request is made**. A
     * precomputed snapshot is single-subject: if a different runtime context has been set,
     * it is ignored (the snapshot is served for its embedded context) and a warning is
     * logged. Use a rules-based configuration for per-context evaluation.
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
    setConfiguration = (configuration: ParsedFlagsConfiguration): void => {
        this.loadedConfiguration = configuration;
        this.applyConfiguration();
    };

    /**
     * Reconcile the loaded configuration against the active evaluation context and
     * (re)compute the servable flag cache and configuration status.
     */
    private applyConfiguration = (): void => {
        const precomputed = this.loadedConfiguration?.precomputed;

        // Only precomputed configurations are supported for now. An empty configuration
        // (an invalid/failed wire parse, or a server-only wire) is not usable.
        //
        // FORWARD-COMPAT SEAM: when the `server`/rules branch is parsed (see
        // `ParsedFlagsConfiguration`), it must be handled BEFORE this guard — a rules
        // configuration is context-agnostic and must NOT be rejected here as `invalid`.
        if (!precomputed) {
            this.flagsCache = {};
            this.configurationStatus = 'invalid';
            InternalLog.log(
                `No usable precomputed configuration was provided for '${this.clientName}'.`,
                SdkVerbosity.WARN
            );
            return;
        }

        let decoded: Record<string, FlagCacheEntry>;
        try {
            decoded = decodePrecomputedFlags(precomputed.response);
        } catch (error) {
            this.flagsCache = {};
            this.configurationStatus = 'invalid';
            if (error instanceof Error) {
                InternalLog.log(
                    `Unsupported flags configuration for '${this.clientName}': ${error.message}`,
                    SdkVerbosity.WARN
                );
            }
            return;
        }

        // If no context has been set yet, adopt the configuration's embedded context
        // (implicit set — no native fetch). A context-agnostic configuration falls back
        // to an empty context so evaluation can proceed.
        if (!this.evaluationContext) {
            if (precomputed.context) {
                this.evaluationContext = normalizeWireContext(
                    precomputed.context
                );
            } else {
                InternalLog.log(
                    `The provided configuration for '${this.clientName}' has no embedded context; treating it as context-agnostic.`,
                    SdkVerbosity.WARN
                );
                this.evaluationContext = { targetingKey: '', attributes: {} };
            }

            this.flagsCache = decoded;
            this.configurationStatus = 'ready';
            return;
        }

        // A context is already set. An offline precomputed configuration is a snapshot
        // bound to the context it was computed for, and offline never fetches, so it cannot
        // be recomputed for a different subject. A runtime context that does not match is
        // therefore IGNORED: revert to the embedded context, keep serving the snapshot, and
        // warn once. (Precomputed is single-subject by design — a rules-based configuration
        // is the path for per-context evaluation.)
        if (
            !contextMatchesConfiguration(
                precomputed.context,
                this.evaluationContext
            )
        ) {
            InternalLog.log(
                `Ignoring the evaluation context set for '${this.clientName}': an offline precomputed configuration is served against the context it was computed for. Set a matching context, or use a rules-based configuration for per-context evaluation.`,
                SdkVerbosity.WARN
            );
            this.evaluationContext = precomputed.context
                ? normalizeWireContext(precomputed.context)
                : { targetingKey: '', attributes: {} };
        }

        this.flagsCache = decoded;
        this.configurationStatus = 'ready';
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
        // A loaded-but-unusable configuration surfaces as PROVIDER_NOT_READY at the
        // evaluation layer (distinct from FLAG_NOT_FOUND). The dedicated PROVIDER_ERROR
        // provider event is wired by the OpenFeature provider in a later step.
        if (this.configurationStatus === 'invalid') {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: 'PROVIDER_NOT_READY',
                errorMessage: `The loaded configuration for '${this.clientName}' is not usable. Provide a valid precomputed configuration.`
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
        const flag = this.flagsCache[key];

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
