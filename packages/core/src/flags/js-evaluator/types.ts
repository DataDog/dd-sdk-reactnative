/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export type JsonPrimitive = null | boolean | string | number;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type FlagValueType = 'boolean' | 'string' | 'number' | 'object';
export type VariantType = 'BOOLEAN' | 'INTEGER' | 'NUMERIC' | 'STRING' | 'JSON';

export type EvaluationContext = {
    targetingKey?: string | null;
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
};

export type ResolutionDetails<T> = {
    value: T;
    reason: string;
    variant?: string;
    errorCode?: string;
    flagMetadata?: Record<string, unknown>;
};

export type Condition = {
    operator: string;
    attribute: string;
    value: unknown;
};

export type Rule = {
    conditions?: Condition[];
};

export type ShardRange = {
    start: number;
    end: number;
};

export type Shard = {
    salt: string;
    ranges: ShardRange[];
    totalShards: number;
};

export type Split = {
    variationKey: string;
    shards?: Shard[];
    serialId?: number;
    extraLogging?: Record<string, unknown>;
};

export type Allocation = {
    key?: string;
    rules?: Rule[];
    startAt?: string;
    endAt?: string;
    splits?: Split[];
    doLog?: boolean;
    extraLogging?: Record<string, unknown>;
};

export type VariantConfiguration = {
    key: string;
    value: JsonValue;
};

export type Flag = {
    key: string;
    enabled: boolean;
    variationType: VariantType;
    variations: Record<string, VariantConfiguration>;
    allocations?: Allocation[];
};

export type UniversalFlagConfiguration = {
    createdAt?: string;
    format?: string;
    environment?: {
        name?: string;
    };
    flags: Record<string, Flag>;
};

export type UniversalFlagConfigurationResponse = {
    data: {
        attributes: UniversalFlagConfiguration;
    };
};
