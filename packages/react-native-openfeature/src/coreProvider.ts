/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags } from '@datadog/mobile-react-native';
import type { FlagDetails, FlagsClient } from '@datadog/mobile-react-native';
import { OpenFeatureEventEmitter, ErrorCode } from '@openfeature/web-sdk';
import type {
    EvaluationContext as OFEvaluationContext,
    JsonValue,
    Logger,
    Paradigm,
    Provider,
    ProviderMetadata,
    ResolutionDetails,
    ProviderEventEmitter,
    ProviderEvents
} from '@openfeature/web-sdk';

export interface DatadogOpenFeatureProviderOptions {
    /**
     * The name of the Datadog Flags client to use.
     *
     * Provide this parameter in order to use different Datadog Flags clients for different OpenFeature domains.
     *
     * @default 'default'
     */
    clientName?: string;
}

/**
 * Shared base for the Datadog OpenFeature providers. It owns the `FlagsClient`, the event
 * emitter, and evaluation (`resolveX`) — everything the online and offline providers have in
 * common. It does not decide how the evaluation context is sourced (fetch vs. offline load);
 * concrete providers implement `initialize`/`onContextChange`.
 *
 * Internal: not exported from the package entry point. Customers use
 * `DatadogOpenFeatureProvider` (online) or `DatadogOfflineOpenFeatureProvider` (offline).
 */
export abstract class DatadogCoreOpenFeatureProvider implements Provider {
    readonly runsOn: Paradigm = 'client';
    abstract readonly metadata: ProviderMetadata;

    private options: DatadogOpenFeatureProviderOptions;
    protected flagsClient: FlagsClient;

    readonly events: ProviderEventEmitter<ProviderEvents> = new OpenFeatureEventEmitter();

    constructor(options: DatadogOpenFeatureProviderOptions = {}) {
        if (!options.clientName) {
            options.clientName = 'default';
        }

        this.options = options;

        this.flagsClient = DdFlags.getClient(this.options.clientName);
    }

    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean,
        _context: OFEvaluationContext,
        _logger: Logger
    ): ResolutionDetails<boolean> {
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
        // The OpenFeature spec states that the return value can be any valid JSON value.
        // However, the Datadog Flags feature only supports JSON objects for the JSON feature flag type.
        // Thus, the user should always expect the returned value to be an object instead of any arbitrary JSON value.
        // Also, the user is responsible for providing a proper `defaultValue` that's an object.

        const details = this.flagsClient.getObjectDetails<T>(
            flagKey,
            defaultValue
        );
        return toFlagResolution(details);
    }
}

const toFlagResolution = <T>(details: FlagDetails<T>): ResolutionDetails<T> => {
    const {
        value,
        reason,
        variant,
        allocationKey,
        errorCode,
        errorMessage
    } = details;

    const parsedErrorCode =
        errorCode && (ErrorCode[errorCode as ErrorCode] || ErrorCode.GENERAL);

    const result: ResolutionDetails<T> = {
        value,
        reason,
        variant,
        flagMetadata: allocationKey ? { allocationKey } : undefined,
        errorCode: parsedErrorCode,
        errorMessage
    };

    return result;
};
