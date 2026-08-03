/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    evaluateRulesBasedConfiguration,
    OperatorType
} from '@datadog/flagging-core';
import type { UniversalFlagConfigurationV1 } from '@datadog/flagging-core';

import type { EvaluationContext, JsonValue, PrimitiveValue } from '../types';

// TODO(FFL-2837): Replace this legacy UFC v1 alias with
// `NonNullable<FlagsConfiguration['rules']>['response']` after a flagging-core
// release contains DataDog/openfeature-js-client#344 through `9f794c7`, restores
// 32-byte SHA digest validation, and defines or fixes integer evaluation without
// global `BigInt`. Keep the `FlagsConfiguration` type import on the flagging-core
// package root. PR #344 preserves protobuf integers as `bigint`, and its evaluator
// reports unsafe conversions as deterministic per-flag `PARSE_ERROR` results when
// `BigInt` is available.
type RulesConfigurationResponse = UniversalFlagConfigurationV1;

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
 * `id` and `targetingKey` are reserved. The adapter always derives them from
 * `EvaluationContext.targetingKey`.
 */
export const toRulesEvaluationContext = (
    context: EvaluationContext
): RulesEvaluationContext => {
    const attributes = new Map<string, PrimitiveValue>();

    for (const [key, value] of Object.entries(context.attributes ?? {})) {
        if (key === 'id' || key === 'targetingKey' || value === undefined) {
            continue;
        }
        attributes.set(key, value);
    }

    return {
        ...Object.fromEntries(attributes),
        targetingKey: context.targetingKey
    };
};

const hasOwn = (value: object, key: PropertyKey): boolean =>
    Object.prototype.hasOwnProperty.call(value, key);

// TODO(FFL-2837): Delete this compatibility error store after a flagging-core
// release contains DataDog/openfeature-js-client#344 through `9f794c7` and fixes
// or explicitly excludes integer and shard evaluation without global `BigInt`.
// The generated protobuf evaluator validates the requested flag and the data
// that evaluation reaches. It does not build this error map during parsing.
// It returns deterministic `PARSE_ERROR` results, including for an integer that
// is not a safe JavaScript number.
const errorsByConfiguration = new WeakMap<
    RulesConfigurationResponse,
    ReadonlyMap<string, string>
>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isJsonValue = (value: unknown): value is JsonValue => {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'boolean'
    ) {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    if (isRecord(value)) {
        return Object.values(value).every(isJsonValue);
    }
    return false;
};

const variationValueIsValid = (
    variationType: string,
    value: unknown
): boolean => {
    switch (variationType) {
        case 'BOOLEAN':
            return typeof value === 'boolean';
        case 'STRING':
            return typeof value === 'string';
        case 'INTEGER':
            return typeof value === 'number' && Number.isSafeInteger(value);
        case 'NUMERIC':
            return typeof value === 'number' && Number.isFinite(value);
        case 'JSON':
            return isJsonValue(value);
        default:
            return false;
    }
};

const SUPPORTED_OPERATORS: ReadonlySet<string> = new Set(
    Object.values(OperatorType)
);

const validateCondition = (value: unknown): string | undefined => {
    if (
        !isRecord(value) ||
        typeof value.attribute !== 'string' ||
        typeof value.operator !== 'string'
    ) {
        return 'A rule condition has an invalid shape.';
    }

    if (!SUPPORTED_OPERATORS.has(value.operator)) {
        return 'The rules configuration uses an unsupported operator.';
    }

    switch (value.operator) {
        case OperatorType.MATCHES:
        case OperatorType.NOT_MATCHES:
            if (typeof value.value !== 'string') {
                return 'A regular expression condition must contain a string.';
            }
            try {
                // TODO(FFL-2837): Define a bounded regular expression policy before
                // dynamic offline rules leave draft state. Upstream PR #344 through
                // `9f794c7` compiles protobuf regular expressions lazily and caches
                // them by configuration and index, but it does not limit patterns.
                RegExp(value.value); // dd-iac-scan ignore-line
            } catch {
                return 'A regular expression condition is not valid.';
            }
            return undefined;
        case OperatorType.ONE_OF:
        case OperatorType.NOT_ONE_OF:
            return Array.isArray(value.value) &&
                value.value.every(item => typeof item === 'string')
                ? undefined
                : 'A membership condition must contain a string array.';
        case OperatorType.GTE:
        case OperatorType.GT:
        case OperatorType.LTE:
        case OperatorType.LT:
            return typeof value.value === 'number' &&
                Number.isFinite(value.value)
                ? undefined
                : 'A numeric condition must contain a finite number.';
        case OperatorType.IS_NULL:
            return typeof value.value === 'boolean'
                ? undefined
                : 'A null condition must contain a boolean.';
        default:
            return 'The rules configuration uses an unsupported operator.';
    }
};

const validateRules = (value: unknown): string | undefined => {
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        return 'An allocation rules field must be an array.';
    }

    for (const rule of value) {
        if (!isRecord(rule) || !Array.isArray(rule.conditions)) {
            return 'A rule has an invalid shape.';
        }
        for (const condition of rule.conditions) {
            const error = validateCondition(condition);
            if (error) {
                return error;
            }
        }
    }

    return undefined;
};

const validateShards = (value: unknown): string | undefined => {
    if (!Array.isArray(value)) {
        return 'A split shards field must be an array.';
    }

    for (const shard of value) {
        if (
            !isRecord(shard) ||
            typeof shard.salt !== 'string' ||
            !Number.isInteger(shard.totalShards) ||
            (shard.totalShards as number) <= 0 ||
            !Array.isArray(shard.ranges)
        ) {
            return 'A shard has an invalid shape.';
        }
        if (!Number.isSafeInteger(shard.totalShards)) {
            return 'Protobuf uint64 cannot be represented safely as a JavaScript number';
        }

        for (const range of shard.ranges) {
            if (
                !isRecord(range) ||
                !Number.isInteger(range.start) ||
                !Number.isInteger(range.end) ||
                (range.start as number) < 0 ||
                (range.end as number) <= (range.start as number) ||
                (range.end as number) > (shard.totalShards as number)
            ) {
                return 'A shard range is not valid.';
            }
            if (
                !Number.isSafeInteger(range.start) ||
                !Number.isSafeInteger(range.end)
            ) {
                return 'Protobuf uint64 cannot be represented safely as a JavaScript number';
            }
        }
    }

    return undefined;
};

const isValidDate = (value: unknown): boolean =>
    value instanceof Date
        ? !Number.isNaN(value.getTime())
        : typeof value === 'string' && !Number.isNaN(Date.parse(value));

const validateAllocation = (
    value: unknown,
    variations: Record<string, unknown>
): string | undefined => {
    if (
        !isRecord(value) ||
        typeof value.key !== 'string' ||
        !Array.isArray(value.splits)
    ) {
        return 'An allocation has an invalid shape.';
    }

    if (value.startAt !== undefined && !isValidDate(value.startAt)) {
        return 'An allocation start time is not valid.';
    }
    if (value.endAt !== undefined && !isValidDate(value.endAt)) {
        return 'An allocation end time is not valid.';
    }

    const rulesError = validateRules(value.rules);
    if (rulesError) {
        return rulesError;
    }

    for (const split of value.splits) {
        if (
            !isRecord(split) ||
            typeof split.variationKey !== 'string' ||
            !hasOwn(variations, split.variationKey)
        ) {
            return 'A split has an invalid variation key.';
        }
        if (split.serialId !== undefined && !Number.isInteger(split.serialId)) {
            return 'A split serial ID is not valid.';
        }

        const shardsError = validateShards(split.shards);
        if (shardsError) {
            return shardsError;
        }
    }

    return undefined;
};

const validateFlag = (value: unknown): string | undefined => {
    if (
        !isRecord(value) ||
        typeof value.key !== 'string' ||
        typeof value.enabled !== 'boolean' ||
        typeof value.variationType !== 'string' ||
        !isRecord(value.variations) ||
        !Array.isArray(value.allocations)
    ) {
        return 'A flag has an invalid shape.';
    }

    if (
        !['BOOLEAN', 'INTEGER', 'NUMERIC', 'STRING', 'JSON'].includes(
            value.variationType
        )
    ) {
        return `A flag uses the unsupported variation type "${value.variationType}".`;
    }

    for (const variation of Object.values(value.variations)) {
        if (
            value.variationType === 'INTEGER' &&
            isRecord(variation) &&
            typeof variation.value === 'number' &&
            !Number.isSafeInteger(variation.value)
        ) {
            return 'Integer variation value cannot be represented safely as a JavaScript number';
        }
        if (
            !isRecord(variation) ||
            typeof variation.key !== 'string' ||
            !variationValueIsValid(value.variationType, variation.value)
        ) {
            return 'A variation has an invalid shape or value.';
        }
    }

    for (const allocation of value.allocations) {
        const error = validateAllocation(allocation, value.variations);
        if (error) {
            return error;
        }
    }

    return undefined;
};

const validateRulesConfigurationEnvelope = (
    value: unknown
): string | undefined => {
    if (
        !isRecord(value) ||
        typeof value.createdAt !== 'string' ||
        typeof value.format !== 'string' ||
        !isRecord(value.environment) ||
        typeof value.environment.name !== 'string' ||
        !isRecord(value.flags)
    ) {
        return 'The rules configuration has an invalid envelope.';
    }

    return undefined;
};

const cloneValue = (value: unknown): unknown => {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (Array.isArray(value)) {
        return value.map(cloneValue);
    }
    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
        );
    }
    return value;
};

const freezeValue = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
        return;
    }

    Object.freeze(value);
    for (const item of Object.values(value)) {
        freezeValue(item);
    }
};

export type PreparedRulesConfiguration =
    | {
          status: 'ready';
          configuration: RulesConfigurationResponse;
      }
    | {
          status: 'error';
          errorMessage: string;
      };

/**
 * Clone and validate untrusted rules before `FlagsClient` stores them.
 */
export const prepareRulesConfiguration = (
    value: unknown
): PreparedRulesConfiguration => {
    const clone = cloneValue(value);

    // TODO(FFL-2837): Delete this legacy JSON clone and validator after a
    // flagging-core release contains upstream PR #344 through `9f794c7` and the
    // no-`BigInt` integer contract is fixed or declared unsupported. That
    // implementation preserves protobuf integers as `bigint` and validates only
    // the requested flag data that evaluation reaches. With `BigInt`, it returns a
    // deterministic per-flag error when evaluation cannot produce a safe number.
    // Do not adapt this validator to the generated response type.
    const errorMessage = validateRulesConfigurationEnvelope(clone);
    if (errorMessage) {
        return { status: 'error', errorMessage };
    }

    const configuration = clone as RulesConfigurationResponse;
    const flags = configuration.flags;
    const errors = new Map<string, string>();
    for (const [flagKey, flag] of Object.entries(flags)) {
        const flagError = validateFlag(flag);
        if (flagError) {
            errors.set(flagKey, flagError);
        }
    }

    freezeValue(clone);
    if (errors.size > 0) {
        errorsByConfiguration.set(configuration, errors);
    }
    return {
        status: 'ready',
        configuration
    };
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
        case 'BOOLEAN':
            return 'boolean';
        case 'STRING':
            return 'string';
        case 'INTEGER':
        case 'NUMERIC':
            return 'number';
        case 'JSON':
            return 'object';
        default:
            return undefined;
    }
};

// TODO(FFL-2837): Delete this legacy UFC v1 metadata fallback after the
// flagging-core dependency contains DataDog/openfeature-js-client#344 through
// `9f794c7`. The protobuf evaluator maps only safely represented integer
// variations, and all numeric variations, to the OpenFeature type `number`.
const recoverVariationType = (
    configuration: RulesConfigurationResponse,
    flagKey: string
): RulesValueType | undefined => {
    const flags = configuration.flags as Record<string, unknown>;
    if (!hasOwn(flags, flagKey)) {
        return undefined;
    }

    const flag = flags[flagKey];
    if (!isRecord(flag)) {
        return undefined;
    }

    return normalizeVariationType(flag.variationType);
};

export const flaggingCoreRulesEngine: RulesEngine = {
    evaluate<T extends RulesValueType>(
        request: RulesEvaluationRequest<T>
    ): RulesEvaluationDetails<RulesValueByType[T]> {
        const flags = request.configuration.flags as Record<string, unknown>;

        // TODO(FFL-2837): Delete this local compatibility guard after the
        // flagging-core dependency contains DataDog/openfeature-js-client#344
        // through `9f794c7`. Keep the reserved-name contract tests.
        if (!hasOwn(flags, request.flagKey)) {
            return {
                value: request.defaultValue,
                reason: 'ERROR',
                errorCode: 'FLAG_NOT_FOUND',
                metadata: {}
            };
        }

        // TODO(FFL-2837): Delete this compatibility check with the local error
        // store after the published PR #344 evaluator through `9f794c7` validates
        // reached flag data and reports deterministic flag-scoped errors, including
        // unsupported feature levels and unsafe integer conversions with and
        // without global `BigInt` when supported.
        const configurationError = errorsByConfiguration
            .get(request.configuration)
            ?.get(request.flagKey);
        if (configurationError) {
            return {
                value: request.defaultValue,
                reason: 'ERROR',
                errorCode: 'PARSE_ERROR',
                errorMessage: configurationError,
                metadata: {}
            };
        }

        const result = evaluateRules(
            request.configuration,
            request.type,
            request.flagKey,
            request.defaultValue,
            request.context,
            request.logger
        );
        const rawMetadata = result.flagMetadata ?? {};
        const allocationKey =
            typeof rawMetadata.allocationKey === 'string'
                ? rawMetadata.allocationKey
                : typeof rawMetadata.__dd_allocation_key === 'string'
                ? rawMetadata.__dd_allocation_key
                : undefined;
        return {
            value: result.value,
            reason: result.reason,
            variant: result.variant,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            metadata: {
                allocationKey,
                variationType:
                    normalizeVariationType(rawMetadata.variationType) ??
                    recoverVariationType(
                        request.configuration,
                        request.flagKey
                    ),
                doLog:
                    typeof rawMetadata.doLog === 'boolean'
                        ? rawMetadata.doLog
                        : typeof rawMetadata.__dd_do_log === 'boolean'
                        ? rawMetadata.__dd_do_log
                        : undefined
            }
        };
    }
};
