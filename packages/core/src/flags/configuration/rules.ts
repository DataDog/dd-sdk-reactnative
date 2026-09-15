/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { evaluateRulesBasedConfiguration } from '@datadog/flagging-core';
import type { FlagsConfiguration } from '@datadog/flagging-core';

import type { EvaluationContext, JsonValue, PrimitiveValue } from '../types';

export type RulesConfigurationResponse = NonNullable<
    FlagsConfiguration['rules']
>['response'];

export type RulesValueType = 'boolean' | 'string' | 'number' | 'object';

type RulesValueByType = {
    boolean: boolean;
    string: string;
    number: number;
    object: JsonValue;
};

export interface RulesLogger {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

export interface RulesEvaluationContext {
    targetingKey?: string;
    [key: string]: PrimitiveValue | undefined;
}

export interface RulesEvaluationMetadata {
    allocationKey?: string;
    variationType?: RulesValueType;
    doLog?: boolean;
}

export interface RulesEvaluationDetails<T> {
    value: T;
    reason?: string;
    variant?: string;
    errorCode?: string;
    errorMessage?: string;
    metadata: RulesEvaluationMetadata;
}

export interface RulesEvaluationRequest<T extends RulesValueType> {
    configuration: RulesConfigurationResponse;
    type: T;
    flagKey: string;
    defaultValue: RulesValueByType[T];
    context: RulesEvaluationContext;
    logger: RulesLogger;
}

export interface RulesEngine {
    evaluate<T extends RulesValueType>(
        request: RulesEvaluationRequest<T>
    ): RulesEvaluationDetails<RulesValueByType[T]>;
}

type RawEvaluationDetails<T> = {
    value: T;
    reason?: string;
    variant?: string;
    errorCode?: string;
    errorMessage?: string;
    flagMetadata?: Record<string, unknown>;
};

type EvaluateRules = <T extends RulesValueType>(
    configuration: RulesConfigurationResponse,
    type: T,
    flagKey: string,
    defaultValue: RulesValueByType[T],
    context: RulesEvaluationContext,
    logger: RulesLogger
) => RawEvaluationDetails<RulesValueByType[T]>;

const evaluateRules = evaluateRulesBasedConfiguration as EvaluateRules;

const NOOP_LOGGER: RulesLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
};

export const getNoopRulesLogger = (): RulesLogger => NOOP_LOGGER;

/**
 * Convert the SDK context to the flat context that flagging-core uses.
 *
 * `id` and `targetingKey` are reserved. The adapter always derives the
 * targeting key from `EvaluationContext.targetingKey`.
 */
export const toRulesEvaluationContext = (
    context: EvaluationContext
): RulesEvaluationContext => {
    const attributes = Object.entries(context.attributes ?? {}).filter(
        ([key, value]) =>
            key !== 'id' && key !== 'targetingKey' && value !== undefined
    );

    return Object.fromEntries([
        ...attributes,
        ['targetingKey', context.targetingKey]
    ]) as RulesEvaluationContext;
};

const normalizeVariationType = (
    variationType: unknown
): RulesValueType | undefined => {
    switch (variationType) {
        case 'boolean':
        case 'string':
        case 'number':
        case 'object':
            return variationType;
        default:
            return undefined;
    }
};

export const flaggingCoreRulesEngine: RulesEngine = {
    evaluate<T extends RulesValueType>(
        request: RulesEvaluationRequest<T>
    ): RulesEvaluationDetails<RulesValueByType[T]> {
        // TODO(FFL-2837): Define a bounded regular-expression policy before
        // dynamic offline rules leave draft state. Flagging-core 3.0.0 compiles
        // protobuf regular expressions lazily and caches them, but it does not
        // limit pattern complexity or evaluation time.
        const result = evaluateRules(
            request.configuration,
            request.type,
            request.flagKey,
            request.defaultValue,
            request.context,
            request.logger
        );
        const rawMetadata = result.flagMetadata ?? {};

        return {
            value: result.value,
            reason: result.reason,
            variant: result.variant,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            metadata: {
                allocationKey:
                    typeof rawMetadata.allocationKey === 'string'
                        ? rawMetadata.allocationKey
                        : undefined,
                variationType: normalizeVariationType(
                    rawMetadata.variationType
                ),
                doLog:
                    typeof rawMetadata.doLog === 'boolean'
                        ? rawMetadata.doLog
                        : undefined
            }
        };
    }
};
