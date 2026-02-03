/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { JsonValue, EvaluationContext, FlagDetails } from './types';

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private clientName: string;

    private evaluationContext: EvaluationContext | undefined = undefined;

    private flagsCache: Record<string, FlagCacheEntry> = {};

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
        } catch (error) {
            if (error instanceof Error) {
                InternalLog.log(
                    `Error setting flag evaluation context: ${error.message}`,
                    SdkVerbosity.ERROR
                );
            }

            throw error;
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
