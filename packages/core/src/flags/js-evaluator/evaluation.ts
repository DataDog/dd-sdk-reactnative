/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    ErrorCode,
    StandardResolutionReasons,
    TargetingKeyMissingError
} from './openfeature';
import { matchesRule } from './rules';
import { matchesShard } from './sharding';
import type {
    Allocation,
    EvaluationContext,
    Flag,
    FlagValueType,
    JsonValue,
    ResolutionDetails,
    Split,
    UniversalFlagConfiguration,
    UniversalFlagConfigurationResponse,
    VariantType
} from './types';

export function evaluate<T extends JsonValue>(
    inputConfig: UniversalFlagConfiguration | UniversalFlagConfigurationResponse | undefined,
    type: FlagValueType,
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    options: { nowMs?: number } = {}
): ResolutionDetails<T> {
    const config = unwrapConfiguration(inputConfig);
    if (!config) {
        return defaultResult(defaultValue, StandardResolutionReasons.ERROR, ErrorCode.PROVIDER_NOT_READY);
    }

    const subjectKey = context.targetingKey;
    const flag = config.flags[flagKey];
    if (!flag) {
        return defaultResult(defaultValue, StandardResolutionReasons.ERROR, ErrorCode.FLAG_NOT_FOUND);
    }

    try {
        return evaluateForSubject(
            flag,
            type,
            subjectKey,
            subjectAttributes(context),
            defaultValue,
            options.nowMs
        );
    } catch (error) {
        if (error instanceof TargetingKeyMissingError) {
            return defaultResult(
                defaultValue,
                StandardResolutionReasons.ERROR,
                ErrorCode.TARGETING_KEY_MISSING
            );
        }
        return defaultResult(defaultValue, StandardResolutionReasons.ERROR, ErrorCode.GENERAL);
    }
}

export function unwrapConfiguration(
    inputConfig: UniversalFlagConfiguration | UniversalFlagConfigurationResponse | undefined
): UniversalFlagConfiguration | undefined {
    if (!inputConfig) {
        return undefined;
    }
    if ('data' in inputConfig) {
        return inputConfig.data.attributes;
    }
    return inputConfig;
}

function evaluateForSubject<T extends JsonValue>(
    flag: Flag,
    type: FlagValueType,
    subjectKey: string | null | undefined,
    attributes: Record<string, unknown>,
    defaultValue: T,
    nowMs?: number
): ResolutionDetails<T> {
    if (!flag.enabled) {
        return defaultResult(defaultValue, StandardResolutionReasons.DISABLED);
    }
    if (!typeMatches(type, flag.variationType)) {
        return defaultResult(defaultValue, StandardResolutionReasons.ERROR, ErrorCode.TYPE_MISMATCH);
    }

    for (const allocation of flag.allocations ?? []) {
        if (!allocationIsActive(allocation, nowMs)) {
            continue;
        }
        if (!rulesMatch(allocation, attributes)) {
            continue;
        }
        const selectedSplit = firstMatchingSplit(allocation.splits ?? [], subjectKey);
        if (!selectedSplit) {
            continue;
        }
        const variant = flag.variations[selectedSplit.variationKey];
        if (!variant) {
            continue;
        }
        const extraLogging = selectedSplit.extraLogging ?? allocation.extraLogging ?? {};
        return {
            value: variant.value as T,
            reason: evaluationReason(allocation, selectedSplit),
            variant: variant.key,
            flagMetadata: {
                allocationKey: allocation.key,
                doLog: !!allocation.doLog,
                extraLogging,
                splitSerialId: selectedSplit.serialId,
                variationType: type
            }
        };
    }

    return defaultResult(defaultValue, StandardResolutionReasons.DEFAULT);
}

function subjectAttributes(context: EvaluationContext): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    if (context.targetingKey != null) {
        attributes.id = context.targetingKey;
    }
    const nestedAttributes = context.attributes ?? {};
    Object.assign(attributes, nestedAttributes);
    Object.keys(context).forEach(key => {
        if (key !== 'targetingKey' && key !== 'attributes') {
            attributes[key] = context[key];
        }
    });
    return attributes;
}

function typeMatches(expectedType: FlagValueType, variantType: VariantType): boolean {
    return (
        (expectedType === 'boolean' && variantType === 'BOOLEAN') ||
        (expectedType === 'string' && variantType === 'STRING') ||
        (expectedType === 'number' &&
            (variantType === 'INTEGER' || variantType === 'NUMERIC')) ||
        (expectedType === 'object' && variantType === 'JSON')
    );
}

function allocationIsActive(allocation: Allocation, nowMs?: number): boolean {
    const now = nowMs ?? Date.now();
    const startAt = allocation.startAt ? Date.parse(allocation.startAt) : undefined;
    const endAt = allocation.endAt ? Date.parse(allocation.endAt) : undefined;
    if (
        (allocation.startAt && !Number.isFinite(startAt)) ||
        (allocation.endAt && !Number.isFinite(endAt))
    ) {
        return false;
    }
    return (startAt === undefined || now >= startAt) && (endAt === undefined || now < endAt);
}

function rulesMatch(
    allocation: Allocation,
    attributes: Record<string, unknown>
): boolean {
    const rules = allocation.rules ?? [];
    return rules.length === 0 || rules.some(rule => matchesRule(rule, attributes));
}

function firstMatchingSplit(
    splits: Split[],
    subjectKey: string | null | undefined
): Split | undefined {
    for (const split of splits) {
        const shards = split.shards ?? [];
        if (shards.length === 0) {
            return split;
        }
        if (subjectKey == null) {
            throw new TargetingKeyMissingError();
        }
        if (shards.every(shard => matchesShard(shard, subjectKey))) {
            return split;
        }
    }
    return undefined;
}

function evaluationReason(allocation: Allocation, split: Split): string {
    if ((allocation.rules ?? []).length > 0) {
        return StandardResolutionReasons.TARGETING_MATCH;
    }
    if (allocation.startAt || allocation.endAt) {
        return StandardResolutionReasons.DEFAULT;
    }
    return (split.shards ?? []).length > 0
        ? StandardResolutionReasons.SPLIT
        : StandardResolutionReasons.STATIC;
}

function defaultResult<T extends JsonValue>(
    defaultValue: T,
    reason: string,
    errorCode?: string
): ResolutionDetails<T> {
    return {
        value: defaultValue,
        reason,
        ...(errorCode ? { errorCode } : {})
    };
}
