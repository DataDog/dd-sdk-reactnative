/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const DEFAULT_SITE = 'datadoghq.com';
const DEFAULT_FLAG_EVALUATION_TRACKING_INTERVAL_MS = 10000;
// Matches the bounds the native Feature Flags SDKs apply to the evaluation flush interval.
const MIN_FLAG_EVALUATION_TRACKING_INTERVAL_MS = 1000;
const MAX_FLAG_EVALUATION_TRACKING_INTERVAL_MS = 60000;

/**
 * Options for the exposure and flag evaluation logging hooks. These hooks send events from
 * JavaScript and do not read the configuration given to the native Datadog SDK.
 */
export interface DatadogTrackingHooksOptions {
    /**
     * A Datadog client token.
     */
    clientToken: string;

    /**
     * The Datadog site to send events to.
     *
     * @default 'datadoghq.com'
     */
    site?: string;

    /**
     * The service name attached to events.
     */
    service?: string;

    /**
     * The RUM application ID attached to events.
     */
    applicationId?: string;

    /**
     * A proxy URL. Requests are sent to `<proxy>?ddforward=<intake path and parameters>`.
     */
    proxy?: string;

    /**
     * Flag evaluation tracking interval in milliseconds, between 1000 and 60000.
     *
     * @default 10000
     */
    flagEvaluationTrackingInterval?: number;
}

export interface TrackingConfiguration {
    clientToken: string;
    site: string;
    service?: string;
    applicationId?: string;
    proxy?: string;
    flagEvaluationTrackingInterval: number;
}

export function buildTrackingConfiguration(
    options: DatadogTrackingHooksOptions
): TrackingConfiguration | undefined {
    if (!options || typeof options.clientToken !== 'string') {
        // InternalLog lives in the native SDK package, which these hooks do not require.
        // eslint-disable-next-line no-console
        console.warn(
            'DATADOG: Feature flag tracking hooks need a `clientToken`. No events will be sent.'
        );
        return undefined;
    }

    return {
        clientToken: options.clientToken,
        site: options.site || DEFAULT_SITE,
        service: options.service,
        applicationId: options.applicationId,
        proxy: options.proxy,
        flagEvaluationTrackingInterval: clamp(
            options.flagEvaluationTrackingInterval ??
                DEFAULT_FLAG_EVALUATION_TRACKING_INTERVAL_MS,
            MIN_FLAG_EVALUATION_TRACKING_INTERVAL_MS,
            MAX_FLAG_EVALUATION_TRACKING_INTERVAL_MS
        )
    };
}

const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);
