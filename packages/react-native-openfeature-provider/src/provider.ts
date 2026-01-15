/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags } from '@datadog/mobile-react-native';
import type {
    FlagDetails,
    FlagsClient,
    EvaluationContext as DdEvaluationContext,
    FlagsConfiguration
} from '@datadog/mobile-react-native';
import { ErrorCode } from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    JsonValue,
    Logger,
    Paradigm,
    Provider,
    ProviderMetadata,
    ResolutionDetails,
    PrimitiveValue
} from '@openfeature/web-sdk';

export interface DatadogProviderOptions extends FlagsConfiguration {
    /**
     * The name of the Datadog Flags client to use.
     *
     * Provide this parameter in order to use different Datadog Flags clients for different OpenFeature domains.
     *
     * @default 'default'
     */
    clientName?: string;
}

export class DatadogProvider implements Provider {
    readonly runsOn: Paradigm = 'client';
    readonly metadata: ProviderMetadata = {
        name: 'datadog-react-native'
    };

    private options: DatadogProviderOptions;
    private flagsClient: FlagsClient | undefined;

    constructor(options: DatadogProviderOptions = {}) {
        options.clientName ??= 'default';

        this.options = options;
    }

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        await DdFlags.enable(this.options);

        const flagsClient = DdFlags.getClient(this.options.clientName);

        await flagsClient.setEvaluationContext(toDdContext(context));

        this.flagsClient = flagsClient;
    }

    async onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): Promise<void> {
        if (!this.flagsClient) {
            throw new Error(
                'DatadogProvider not initialized yet. Please wait until `OpenFeature.setProviderAndWait()` completes before setting evaluation context.'
            );
        }

        await this.flagsClient.setEvaluationContext(toDdContext(newContext));
    }

    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean,
        _context: OFEvaluationContext,
        _logger: Logger
    ): ResolutionDetails<boolean> {
        if (!this.flagsClient) {
            return {
                value: defaultValue,
                reason: 'ERROR',
                errorCode: ErrorCode.PROVIDER_NOT_READY
            };
        }

        const details = this.flagsClient.getBooleanDetails(
            flagKey,
            defaultValue
        );
        return toFlagResolution(details);
    }

    resolveStringEvaluation(
        flagKey: string,
        defaultValue: string,
        _context: OFEvaluationContext,
        _logger: Logger
    ): ResolutionDetails<string> {
        if (!this.flagsClient) {
            return {
                value: defaultValue,
                reason: 'ERROR',
                errorCode: ErrorCode.PROVIDER_NOT_READY
            };
        }

        const details = this.flagsClient.getStringDetails(
            flagKey,
            defaultValue
        );
        return toFlagResolution(details);
    }

    resolveNumberEvaluation(
        flagKey: string,
        defaultValue: number,
        _context: OFEvaluationContext,
        _logger: Logger
    ): ResolutionDetails<number> {
        if (!this.flagsClient) {
            return {
                value: defaultValue,
                reason: 'ERROR',
                errorCode: ErrorCode.PROVIDER_NOT_READY
            };
        }

        const details = this.flagsClient.getNumberDetails(
            flagKey,
            defaultValue
        );
        return toFlagResolution(details);
    }

    resolveObjectEvaluation<T extends JsonValue>(
        flagKey: string,
        defaultValue: T,
        _context: OFEvaluationContext,
        _logger: Logger
    ): ResolutionDetails<T> {
        if (!this.flagsClient) {
            return {
                value: defaultValue,
                reason: 'ERROR',
                errorCode: ErrorCode.PROVIDER_NOT_READY
            };
        }

        const details = this.flagsClient.getObjectDetails<T>(
            flagKey,
            defaultValue
        );
        return toFlagResolution(details);
    }
}

const toDdContext = (context: OFEvaluationContext): DdEvaluationContext => {
    const { targetingKey, ...attributes } = context;

    // Important ⚠️
    // The Flags SDK doesn't support nested non-primitive values in the evaluation context as per OF.3 FFE SDK requirement.
    // However, we let the SDK handle this inside of FlagsClient since it does this processing anyways.
    const ddContextAttributes = attributes as Record<string, PrimitiveValue>;

    return {
        // Allow flag evaluations without a provided targeting key.
        targetingKey: targetingKey ?? '',
        attributes: ddContextAttributes
    };
};

const toFlagResolution = <T>(details: FlagDetails<T>): ResolutionDetails<T> => {
    const {
        value,
        reason,
        variant,
        allocationKey,
        errorCode,
        errorMessage
    } = details;

    const result: ResolutionDetails<T> = {
        value,
        reason,
        variant,
        flagMetadata: allocationKey ? { allocationKey } : undefined,
        errorCode: errorCode as ErrorCode | undefined,
        errorMessage
    };

    return result;
};
