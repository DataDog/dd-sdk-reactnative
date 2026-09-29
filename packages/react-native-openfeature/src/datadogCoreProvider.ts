/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { configurationToString } from '@datadog/flagging-core/rules-based';
import type {
    FlagsConfiguration,
    FlagsConfigurationError,
    FlagTypeToValue
} from '@datadog/flagging-core';
import {
    evaluate,
    getFlagsConfigurationError,
    getMD5Hash
} from '@datadog/flagging-core';
import {
    InvalidContextError,
    OpenFeatureEventEmitter,
    ParseError,
    ProviderEvents,
    ProviderNotReadyError
} from '@openfeature/web-sdk';
import type {
    EvaluationContext,
    FlagValueType,
    JsonValue,
    Logger,
    OpenFeatureError,
    Paradigm,
    Provider,
    ProviderEventEmitter,
    ProviderMetadata,
    ResolutionDetails
} from '@openfeature/web-sdk';

/**
 * Evaluates manually supplied configurations in JavaScript using @datadog/flagging-core.
 * Ported from openfeature-js-client's browser DatadogCoreProvider.
 *
 * Unlike the native-backed providers, this provider does not use DdFlags, fetch configuration,
 * or send exposure/RUM events. Load a configuration before registering it with OpenFeature.
 * Precomputed configurations require a matching OpenFeature context, including when it is empty.
 */
export class DatadogCoreProvider implements Provider {
    readonly metadata: ProviderMetadata = { name: 'datadog-core' };
    readonly runsOn: Paradigm = 'client';
    readonly events: ProviderEventEmitter<ProviderEvents> = new OpenFeatureEventEmitter();

    private flagsConfiguration: FlagsConfiguration | undefined;
    private flagsConfigurationId: string | undefined;
    private fallbackConfigurationSequence = 0;
    private context: EvaluationContext | undefined;

    getConfiguration(): FlagsConfiguration | undefined {
        return this.flagsConfiguration;
    }

    setConfiguration(configuration: FlagsConfiguration): void {
        const hadEvaluatableConfiguration = this.canEvaluateCurrentContext();
        this.flagsConfiguration = configuration;
        this.flagsConfigurationId = this.computeConfigurationId(configuration);

        if (this.context === undefined) {
            return;
        }

        const error = toOpenFeatureError(
            getFlagsConfigurationError(configuration, this.context)
        );
        if (error) {
            // The web-sdk's ErrorEvent type omits errorCode, but its provider wrapper reads it.
            const details = {
                error,
                message: error.message,
                errorCode: error.code
            };
            this.events.emit(ProviderEvents.Error, details);
            return;
        }

        if (!hadEvaluatableConfiguration) {
            this.events.emit(ProviderEvents.Ready);
        }
        this.events.emit(ProviderEvents.ConfigurationChanged);
    }

    initialize(context: EvaluationContext = {}): Promise<void> {
        this.context = context;
        const error = toOpenFeatureError(
            getFlagsConfigurationError(this.flagsConfiguration, context)
        );
        return error ? Promise.reject(error) : Promise.resolve();
    }

    onContextChange(
        _oldContext: EvaluationContext,
        newContext: EvaluationContext
    ): void {
        this.context = newContext;
        const error = toOpenFeatureError(
            getFlagsConfigurationError(this.flagsConfiguration, this.context)
        );
        if (error) {
            throw error;
        }
    }

    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean,
        context: EvaluationContext,
        logger: Logger
    ): ResolutionDetails<boolean> {
        return this.resolve('boolean', flagKey, defaultValue, context, logger);
    }

    resolveStringEvaluation(
        flagKey: string,
        defaultValue: string,
        context: EvaluationContext,
        logger: Logger
    ): ResolutionDetails<string> {
        return this.resolve('string', flagKey, defaultValue, context, logger);
    }

    resolveNumberEvaluation(
        flagKey: string,
        defaultValue: number,
        context: EvaluationContext,
        logger: Logger
    ): ResolutionDetails<number> {
        return this.resolve('number', flagKey, defaultValue, context, logger);
    }

    resolveObjectEvaluation<T extends JsonValue>(
        flagKey: string,
        defaultValue: T,
        context: EvaluationContext,
        logger: Logger
    ): ResolutionDetails<T> {
        // OpenFeature requires a specific JsonValue subtype without runtime type information.
        // Callers must provide a default value with the expected shape.
        return this.resolve(
            'object',
            flagKey,
            defaultValue,
            context,
            logger
        ) as ResolutionDetails<T>;
    }

    private resolve<T extends FlagValueType>(
        type: T,
        flagKey: string,
        defaultValue: FlagTypeToValue<T>,
        context: EvaluationContext,
        logger: Logger
    ): ResolutionDetails<FlagTypeToValue<T>> {
        const details = evaluate(
            this.flagsConfiguration,
            type,
            flagKey,
            defaultValue,
            context,
            logger
        );
        if (
            this.flagsConfigurationId === undefined ||
            details.flagMetadata?.doLog !== true ||
            typeof details.flagMetadata?.allocationKey !== 'string' ||
            details.variant == null
        ) {
            return details;
        }

        // Preserve the browser provider's configuration identity for consumers of evaluation metadata.
        return {
            ...details,
            flagMetadata: {
                ...details.flagMetadata,
                __dd_core_configuration_id: this.flagsConfigurationId
            }
        };
    }

    private canEvaluateCurrentContext(): boolean {
        return (
            this.context !== undefined &&
            !getFlagsConfigurationError(this.flagsConfiguration, this.context)
        );
    }

    private computeConfigurationId(configuration: FlagsConfiguration): string {
        try {
            // Retrieval metadata and the UFC build timestamp can change without changing rules.
            // The backend's semantic Fingerprint() also excludes the rules' CreatedAt.
            return getMD5Hash(
                configurationToString({
                    ...configuration,
                    precomputed: configuration.precomputed && {
                        ...configuration.precomputed,
                        fetchedAt: undefined,
                        etag: undefined
                    },
                    rules: configuration.rules && {
                        ...configuration.rules,
                        response: {
                            ...configuration.rules.response,
                            createdAt: undefined
                        },
                        fetchedAt: undefined,
                        etag: undefined
                    }
                })
            );
        } catch {
            this.fallbackConfigurationSequence += 1;
            return `core-configuration-${this.fallbackConfigurationSequence}`;
        }
    }
}

function toOpenFeatureError(
    error: FlagsConfigurationError | undefined
): OpenFeatureError | undefined {
    if (!error) {
        return undefined;
    }
    if (error.errorCode === 'PARSE_ERROR') {
        return new ParseError(error.errorMessage);
    }
    if (error.errorCode === 'INVALID_CONTEXT') {
        return new InvalidContextError(error.errorMessage);
    }
    return new ProviderNotReadyError(error.errorMessage);
}
