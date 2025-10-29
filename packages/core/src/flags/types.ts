/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Evaluation context for flags.
 */
export interface EvaluationContext {
    targetingKey: string;
    attributes: Record<string, unknown>;
}

/**
 * Configuration settings for flags.
 */
export interface DatadogFlagsConfiguration {
    gracefulModeEnabled?: boolean;
    customFlagsEndpoint?: string;
    customFlagsHeaders?: Record<string, string>;
    customExposureEndpoint?: string;
    trackExposures?: boolean;
    rumIntegrationEnabled?: boolean;
}
