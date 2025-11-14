/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Configuration settings for flags.
 */
export interface DatadogFlagsConfiguration {
    enabled: boolean;
    gracefulModeEnabled?: boolean;
    customFlagsEndpoint?: string;
    customFlagsHeaders?: Record<string, string>;
    customExposureEndpoint?: string;
    trackExposures?: boolean;
    rumIntegrationEnabled?: boolean;
}

/**
 * Evaluation context for flags.
 */
export interface EvaluationContext {
    targetingKey: string;
    attributes: Record<string, unknown>;
}

export type FlagEvaluationError =
    | 'PROVIDER_NOT_READY'
    | 'FLAG_NOT_FOUND'
    | 'TYPE_MISMATCH';

export interface FlagDetails<T> {
    key: string;
    value: T;
    variant: string | null;
    reason: string | null;
    error: FlagEvaluationError | null;
}
