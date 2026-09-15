/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagsClient } from './FlagsClient';

export interface DdFlagsType {
    /**
     * Enables the Datadog Flags feature in your application.
     *
     * Call this method after initializing the Datadog SDK to enable feature flag evaluation.
     * This method must be called before creating any `FlagsClient` instances via `DdFlags.getClient()`.
     *
     * @example
     * ```ts
     * import { DdSdkReactNativeConfiguration, DdSdkReactNative, DdFlags } from '@datadog/mobile-react-native';
     *
     * // Initialize the Datadog SDK.
     * await DdSdkReactNative.initialize(...);
     *
     * // Optional flags configuration object.
     * const flagsConfig = {
     *     customFlagsEndpoint: 'https://flags.example.com',
     *     assignmentRequestTimeoutMs: 1_000,
     *     assignmentRequestRetryCount: 1
     * };
     *
     * // Enable the feature.
     * await DdFlags.enable(flagsConfig);
     *
     * // Retrieve the client and access feature flags.
     * const flagsClient = DdFlags.getClient();
     * const flagValue = await flagsClient.getBooleanValue('new-feature', false);
     * ```
     *
     * @param configuration Configuration options for the Datadog Flags feature.
     */
    enable: (configuration?: FlagsConfiguration) => Promise<void>;
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
     * const flagsClient = DdFlags.getClient();
     *
     * // Set the evaluation context.
     * await flagsClient.setEvaluationContext({
     *     targetingKey: 'user-123',
     *     attributes: {
     *         favoriteFruit: 'apple'
     *     }
     * });
     *
     * const flagValue = flagsClient.getBooleanValue('new-feature', false);
     * ```
     */
    getClient: (clientName?: string) => FlagsClient;
}

/**
 * Configuration options for the Datadog Flags feature.
 */
export interface FlagsConfiguration {
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
     * Timeout for each request that retrieves precomputed flag assignments, in milliseconds.
     *
     * The timeout includes downloading the complete response body. When omitted or set to `0`,
     * no timeout is applied by Datadog. This setting does not apply to loading cached assignments
     * or sending exposure, evaluation, or RUM data.
     *
     * The value must be a non-negative integer.
     *
     * @default undefined
     */
    assignmentRequestTimeoutMs?: number;
    /**
     * Number of times to retry a failed request for precomputed flag assignments.
     *
     * This is the number of retries after the initial request. The native SDKs retry transport
     * errors, timeouts, HTTP `408`, and HTTP `5xx` responses with randomized exponential backoff.
     * HTTP `429` responses are not retried. Set to `0` to disable retries.
     *
     * The value must be an integer between `0` and `10`, inclusive.
     *
     * @default 1
     */
    assignmentRequestRetryCount?: number;
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
}

export type PrimitiveValue = null | boolean | string | number;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
/**
 * Represents a JSON node value.
 */
export type JsonValue = PrimitiveValue | JsonObject | JsonArray;

/**
 * Context information used for feature flag targeting and evaluation.
 *
 * Contains user or session information that determines which flag variations are returned.
 * This typically includes a unique identifier (targeting key) and optional custom attributes
 * for granular targeting.
 *
 * Note: Evaluation context should be set before flag evaluations.
 *
 * @example
 * ```ts
 * const context: EvaluationContext = {
 *     targetingKey: "user-123",
 *     attributes: {
 *         "region": "US",
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
     *
     * Pass an empty string if you don't have such an identifier.
     */
    targetingKey: string;

    /**
     * Custom attributes for more granular targeting.
     *
     * Attributes can include user properties, session data, or any other contextual information
     * needed for flag evaluation rules.
     *
     * NOTE: Nested object values are not supported and will be dropped from the evaluation context.
     */
    attributes?: Record<string, PrimitiveValue>;
}

/**
 * An error that occurs during feature flag evaluation.
 *
 * Indicates why a flag evaluation may have failed or returned a default value.
 */
type FlagErrorCode =
    | 'PROVIDER_NOT_READY'
    | 'FLAG_NOT_FOUND'
    | 'PARSE_ERROR'
    | 'TYPE_MISMATCH'
    | 'INVALID_CONTEXT'
    | 'GENERAL';

/**
 * Detailed information about a feature flag evaluation.
 *
 * Contains both the evaluated flag value and metadata about the evaluation,
 * including the variant served, evaluation reason, and any errors that occurred.
 */
export interface FlagDetails<T> {
    /**
     * The feature flag key that was evaluated.
     */
    key: string;
    /**
     * The evaluated flag value.
     *
     * Falls back to the default value if evaluation failed.
     */
    value: T;
    /**
     * The reason why this evaluation result was returned.
     */
    reason: string;
    /**
     * The variant key for the evaluated flag.
     *
     * Variants identify which version of the flag was served.
     */
    variant?: string;
    /**
     * The allocation key for the evaluated flag.
     *
     * Useful for debugging targeting rules.
     */
    allocationKey?: string;
    /**
     * Code of the error that occurred during evaluation, if any.
     */
    errorCode?: FlagErrorCode;
    /**
     * Detailed explanation of the occurred error, if any.
     */
    errorMessage?: string;
}
