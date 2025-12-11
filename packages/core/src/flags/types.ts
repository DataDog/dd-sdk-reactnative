/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagsClient } from './FlagsClient';

export type DatadogFlagsType = {
    /**
     * Enables the Datadog Flags feature in your application.
     *
     * Call this method after initializing the Datadog SDK to enable feature flag evaluation.
     * This method must be called before creating any `FlagsClient` instances via `DatadogFlags.getClient()`.
     *
     * @example
     * ```ts
     * import { DdSdkReactNativeConfiguration, DdSdkReactNative, DatadogFlags } from '@datadog/mobile-react-native';
     *
     * // Initialize the Datadog SDK.
     * await DdSdkReactNative.initialize(...);
     *
     * // Optinal flags configuration object.
     * const flagsConfig = {
     *     customFlagsEndpoint: 'https://flags.example.com'
     * };
     *
     * // Enable the feature.
     * await DatadogFlags.enable(flagsConfig);
     *
     * // Retrieve the client and access feature flags.
     * const flagsClient = DatadogFlags.getClient();
     * const flagValue = await flagsClient.getBooleanValue('new-feature', false);
     * ```
     *
     * @param configuration Configuration options for the Datadog Flags feature.
     */
    enable: (configuration?: DatadogFlagsConfiguration) => Promise<void>;
    /**
     * Returns a `FlagsClient` instance for further feature flag evaluation.
     *
     * For most applications, you would need only one client. If you need multiple clients,
     * you can retrieve a couple of clients with different names.
     *
     * @param clientName An optional name of the client to retrieve. Defaults to `'default'`.
     *
     * @example
     * ```ts
     * // Reminder: you need to initialize the SDK and enable the Flags feature before retrieving the client.
     * const flagsClient = DatadogFlags.getClient();
     * const flagValue = await flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    getClient: (clientName?: string) => FlagsClient;
};

/**
 * Configuration options for the Datadog Flags feature.
 *
 * Use this type to customize the behavior of feature flag evaluation, including custom endpoints,
 * exposure tracking, and error handling modes.
 */
export type DatadogFlagsConfiguration = {
    /**
     * Controls whether the feature flag evaluation feature is enabled.
     */
    enabled: boolean;
    /**
     * Custom server URL for retrieving flag assignments.
     *
     * The provided value should only include the base URL, and the endpoint will be appended automatically.
     * For example, if you provide 'https://flags.example.com', the SDK will use 'https://flags.example.com/precompute-assignments'.
     *
     * If not set, the SDK uses the default Datadog Flags endpoint for the configured site.
     *
     * @default undefined
     */
    customFlagsEndpoint?: string;
    /**
     * Custom server URL for sending Flags exposure data.
     *
     * The provided value should only include the base URL, and the endpoint will be appended automatically.
     * For example, if you provide 'https://flags.example.com', the SDK will use 'https://flags.example.com/api/v2/exposures'.
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
};

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
     *
     * NOTE: Nested object values are not supported and will be omitted from the evaluation context.
     */
    attributes: Record<string, string | number | boolean | null | undefined>;
}

export type ObjectValue = { [key: string]: unknown };

/**
 * An error tha occurs during feature flag evaluation.
 *
 * Indicates why a flag evaluation may have failed or returned a default value.
 */
export type FlagEvaluationError =
    | 'PROVIDER_NOT_READY'
    | 'FLAG_NOT_FOUND'
    | 'PARSE_ERROR'
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
