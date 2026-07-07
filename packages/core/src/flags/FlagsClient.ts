/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

import {
    contextMatchesConfiguration,
    decodePrecomputedFlags,
    normalizeWireContext
} from './configuration';
import type { ParsedFlagsConfiguration } from './configuration';
import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { JsonValue, EvaluationContext, FlagDetails } from './types';

/**
 * Tracks how a configuration supplied via {@link FlagsClient.setConfiguration} relates
 * to the active evaluation context. `'none'` means no offline configuration is engaged
 * (the online/fetch path is in effect).
 */
type ConfigurationStatus = 'none' | 'ready' | 'mismatch' | 'invalid';

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
            this.loadedConfiguration = undefined;
            this.configurationStatus = 'none';
        } catch (error) {
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
     * Load a configuration (parsed from a `ConfigurationWire` string via
     * `configurationFromString`) into the client for offline evaluation.
     *
     * For a precomputed configuration this populates the flag cache and, when no context
     * has been set yet, adopts the configuration's embedded evaluation context — **no
     * network request is made**. If a context has already been set, the configuration's
     * context must match it; otherwise the client serves no values and reports
     * `INVALID_CONTEXT`.
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

        // A context is already set — the configuration must match it.
        if (
            contextMatchesConfiguration(
                precomputed.context,
                this.evaluationContext
            )
        ) {
            this.flagsCache = decoded;
            this.configurationStatus = 'ready';
        } else {
            this.flagsCache = {};
            this.configurationStatus = 'mismatch';
            InternalLog.log(
                `The provided configuration for '${this.clientName}' does not match the active evaluation context.`,
                SdkVerbosity.WARN
            );
        }
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
        if (this.configurationStatus === 'mismatch') {
            return {
                key,
                value: defaultValue,
                reason: 'ERROR',
                errorCode: 'INVALID_CONTEXT',
                errorMessage: `The loaded configuration for '${this.clientName}' does not match the active evaluation context.`
            };
        }

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
