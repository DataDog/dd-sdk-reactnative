/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';

import {
    flagCacheEntryToFlagDetails,
    processEvaluationContext
} from './internal';
import type { FlagCacheEntry } from './internal';
import type { ObjectValue, EvaluationContext, FlagDetails } from './types';

export class FlagsClient {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeFlags: DdNativeFlagsType = require('../specs/NativeDdFlags')
        .default;

    private clientName: string;

    private _evaluationContext: EvaluationContext | undefined = undefined;
    private _flagsCache: Record<string, FlagCacheEntry> = {};

    constructor(clientName: string = 'default') {
        this.clientName = clientName;
    }

    /**
     * Sets the evaluation context for the client.
     *
     * Should be called before evaluating any flags. Otherwise, the client will fall back to serving default flag values.
     *
     * @param context The evaluation context to associate with the current session.
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
        const processedContext = processEvaluationContext(context);

        try {
            const result = await this.nativeFlags.setEvaluationContext(
                this.clientName,
                processedContext.targetingKey,
                processedContext.attributes ?? {}
            );

            this._evaluationContext = processedContext;
            this._flagsCache = result;
        } catch (error) {
            if (error instanceof Error) {
                InternalLog.log(
                    `Error setting flag evaluation context: ${error.message}`,
                    SdkVerbosity.ERROR
                );
            }
        }
    };

    private getDetails = <T>(key: string, defaultValue: T): FlagDetails<T> => {
        // Check whether the evaluation context has already been set.
        if (!this._evaluationContext) {
            InternalLog.log(
                `The evaluation context is not set for the client ${this.clientName}. Please, call \`DdFlags.setEvaluationContext()\` before evaluating any flags.`,
                SdkVerbosity.ERROR
            );

            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'PROVIDER_NOT_READY'
            };
        }

        // Retrieve the flag from the cache.
        const flagCacheEntry = this._flagsCache[key];

        if (!flagCacheEntry) {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'FLAG_NOT_FOUND'
            };
        }

        // Convert to FlagDetails.
        const details = flagCacheEntryToFlagDetails<T>(flagCacheEntry);

        // Track the flag evaluation. Don't await this; non-blocking.
        this.nativeFlags.trackEvaluation(
            this.clientName,
            key,
            flagCacheEntry,
            this._evaluationContext.targetingKey,
            this._evaluationContext.attributes ?? {}
        );

        return details;
    };

    /**
     * Evaluates a boolean feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
     */
    getBooleanDetails = (
        key: string,
        defaultValue: boolean
    ): FlagDetails<boolean> => {
        if (typeof defaultValue !== 'boolean') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        return this.getDetails(key, defaultValue);
    };

    /**
     * Evaluates a string feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
     */
    getStringDetails = (
        key: string,
        defaultValue: string
    ): FlagDetails<string> => {
        if (typeof defaultValue !== 'string') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        return this.getDetails(key, defaultValue);
    };

    /**
     * Evaluates a number feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
     */
    getNumberDetails = (
        key: string,
        defaultValue: number
    ): FlagDetails<number> => {
        if (typeof defaultValue !== 'number') {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        return this.getDetails(key, defaultValue);
    };

    /**
     * Evaluates an object feature flag with detailed evaluation information.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
     */
    getObjectDetails = (
        key: string,
        defaultValue: ObjectValue
    ): FlagDetails<ObjectValue> => {
        if (typeof defaultValue !== 'object' || defaultValue === null) {
            return {
                key,
                value: defaultValue,
                variant: null,
                reason: null,
                error: 'TYPE_MISMATCH'
            };
        }

        return this.getDetails(key, defaultValue);
    };

    /**
     * Returns the value of a boolean feature flag.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
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
     * Returns the value of a string feature flag.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
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
     * Returns the value of a number feature flag.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
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
     * Returns the value of an object feature flag.
     *
     * @param key The key of the flag to evaluate.
     * @param defaultValue The value to return if the flag is not found or evaluation fails.
     *
     * @example
     * ```ts
     * const pageCalloutOptions = flagsClient.getObjectValue('page-callout', { color: 'purple', text: 'Woof!' });
     * ```
     */
    getObjectValue = (key: string, defaultValue: ObjectValue): ObjectValue => {
        return this.getObjectDetails(key, defaultValue).value;
    };
}
