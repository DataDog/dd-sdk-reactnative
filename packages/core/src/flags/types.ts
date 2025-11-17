/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagsClient } from './FlagsClient';

export type DatadogFlagsType = {
    /**
     * Returns a `FlagsClient` instance for further feature flag evaluation.
     *
     * If client name is not provided, the `'default'` client is returned.
     */
    getClient: (clientName?: string) => FlagsClient;
    /**
     * Enables the Datadog Flags feature.
     *
     * TODO: This method is no-op for now, as flags are initialized globally by default.
     */
    enable: (configuration: DatadogFlagsConfiguration) => Promise<void>;
};

/**
 * Configuration options for the Datadog Flags feature.
 *
 * Use this type to customize the behavior of feature flag evaluation, including custom endpoints,
 * exposure tracking, and error handling modes.
 */
export interface DatadogFlagsConfiguration {
    /**
     * Controls whether the feature flag evaluation feature is enabled.
     */
    enabled: boolean;
    /**
     * Custom server URL for retrieving flag assignments.
     *
     * If not set, the SDK uses the default Datadog Flags endpoint for the configured site.
     *
     * @default undefined
     */
    customFlagsEndpoint?: string;
    /**
     * Additional HTTP headers to attach to requests made to `customFlagsEndpoint`.
     *
     * Useful for authentication or routing when using your own Flags service. Ignored when using the default Datadog endpoint.
     *
     * @default undefined
     */
    customFlagsHeaders?: Record<string, string>;
    /**
     * Custom server URL for sending Flags exposure data.
     *
     * If not set, the SDK uses the default Datadog Flags exposure endpoint.
     *
     * @default undefined
     */
    customExposureEndpoint?: string;
    /**
     * Enables exposure logging via the dedicated exposures intake endpoint.
     *
     * When enabled, flag evaluation events are sent to the exposures endpoint for analytics and monitoring.
     *
     * @default true
     */
    trackExposures?: boolean;
    /**
     * Enables the RUM integration.
     *
     * When enabled, flag evaluation events are sent to RUM for correlation with user sessions.
     *
     * @default true
     */
    rumIntegrationEnabled?: boolean;
}

/**
 * Context information used for feature flag targeting and evaluation.
 *
 * The evaluation context contains user or session information that determines which flag
 * variations are returned. This typically includes a unique identifier (targeting key) and
 * optional custom attributes for more granular targeting.
 *
 * You can create an evaluation context and set it on the client before evaluating flags:
 *
 * ```ts
 * const context: EvaluationContext = {
 *     targetingKey: "user-123",
 *     attributes: {
 *         "email": "user@example.com",
 *         "plan": "premium",
 *         "age": 25,
 *         "beta_tester": true
 *     }
 * };
 *
 * await client.setEvaluationContext(context);
 * ```
 */
export interface EvaluationContext {
    /**
     * The unique identifier used for targeting this user or session.
     *
     * This is typically a user ID, session ID, or device ID. The targeting key is used
     * by the feature flag service to determine which variation to serve.
     */
    targetingKey: string;

    /**
     * Custom attributes for more granular targeting.
     *
     * Attributes can include user properties, session data, or any other contextual information
     * needed for flag evaluation rules.
     */
    attributes: Record<string, unknown>;
}

/**
 * An error tha occurs during feature flag evaluation.
 *
 * Indicates why a flag evaluation may have failed or returned a default value.
 */
export type FlagEvaluationError =
    | 'PROVIDER_NOT_READY'
    | 'FLAG_NOT_FOUND'
    | 'TYPE_MISMATCH';

/**
 * Detailed information about a feature flag evaluation.
 *
 * `FlagDetails` contains both the evaluated flag value and metadata about the evaluation,
 * including the variant served, evaluation reason, and any errors that occurred.
 *
 * Use this type when you need access to evaluation metadata beyond just the flag value:
 *
 * ```ts
 * const details = await flagsClient.getBooleanDetails('new-feature', false);
 *
 * if (details.value) {
 *   // Feature is enabled
 *   console.log(`Using variant: ${details.variant ?? 'default'}`);
 * }
 *
 * if (details.error) {
 *   console.log(`Evaluation error: ${details.error}`);
 * }
 * ```
 */
export interface FlagDetails<T> {
    /**
     * The feature flag key that was evaluated.
     */
    key: string;
    /**
     * The evaluated flag value.
     *
     * This is either the flag's assigned value or the default value if evaluation failed.
     */
    value: T;
    /**
     * The variant key for the evaluated flag.
     *
     * Variants identify which version of the flag was served. Returns `null` if the flag
     * was not found or if the default value was used.
     *
     * ```ts
     * const details = await flagsClient.getBooleanDetails('new-feature', false);
     * console.log(`Served variant: ${details.variant ?? 'default'}`);
     * ```
     */
    variant: string | null;
    /**
     * The reason why this evaluation result was returned.
     *
     * Provides context about how the flag was evaluated, such as "TARGETING_MATCH" or "DEFAULT".
     * Returns `null` if the flag was not found.
     */
    reason: string | null;
    /**
     * The error that occurred during evaluation, if any.
     *
     * Returns `null` if evaluation succeeded. Check this property to determine if the returned
     * value is from a successful evaluation or a fallback to the default value.
     */
    error: FlagEvaluationError | null;
}
