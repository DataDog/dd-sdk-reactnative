/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import type { DdNativeFlagsType } from '../nativeModulesTypes';
import { getNativeDdFlags } from '../specs/NativeDdFlags';

import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { EvaluationContext } from './types';

type FlagTrackingAssignment = Pick<
    FlagCacheEntry,
    'allocationKey' | 'variationKey' | 'doLog' | 'serialId'
>;
type TrackingMethod = 'trackExposure' | 'trackRumEvaluation';
type TrackingFailure =
    | 'missing native module'
    | 'unsupported native method'
    | 'native call failed';
const reportedFailures = new Set<string>();

/** @internal Used by the matching-version OpenFeature tracking hooks. */
export function __ddTrackFlagExposure(
    clientName: string,
    key: string,
    flag: FlagTrackingAssignment,
    context: EvaluationContext
): void {
    const captured = processEvaluationContext(context);
    submit('trackExposure', native =>
        native.trackExposure(
            clientName,
            key,
            flag,
            captured.targetingKey,
            captured.attributes ?? {}
        )
    );
}

/** @internal Used by the matching-version OpenFeature tracking hooks. */
export function __ddTrackFlagEvaluationEvent(
    clientName: string,
    key: string,
    flag: FlagTrackingAssignment | null,
    context: EvaluationContext,
    errorCode: string | null,
    observeFullEvaluationData: boolean,
    telemetryTargetingKey: string | null
): void {
    const captured = processEvaluationContext(context);
    submit(native =>
        native.trackProtectedEvaluation(
            clientName,
            key,
            flag,
            captured.targetingKey,
            captured.attributes ?? {},
            errorCode,
            observeFullEvaluationData === true,
            captureTelemetryTargetingKey(telemetryTargetingKey)
        )
    );
}

/** @internal Used by the matching-version OpenFeature tracking hooks. */
export function __ddTrackFlagRumEvaluation(
    clientName: string,
    key: string,
    variant: string,
    context: EvaluationContext
): void {
    const captured = processEvaluationContext(context);
    submit('trackRumEvaluation', native =>
        native.trackRumEvaluation(
            clientName,
            key,
            variant,
            captured.targetingKey,
            captured.attributes ?? {}
        )
    );
}

function submit(
    method: TrackingMethod,
    operation: (native: DdNativeFlagsType) => Promise<void>
): void {
    // Submit immediately. Evaluation must not wait for native acknowledgment or upload.
    try {
        const native = getNativeDdFlags();
        if (!native) {
            logTrackingFailure(method, 'missing native module');
            return;
        }
        if (typeof native[method] !== 'function') {
            logTrackingFailure(method, 'unsupported native method');
            return;
        }
        operation(native).catch(error =>
            logTrackingFailure(method, 'native call failed', error)
        );
    } catch (error) {
        logTrackingFailure(method, 'native call failed', error);
    }
}

function logTrackingFailure(
    method: TrackingMethod,
    reason: TrackingFailure,
    error?: unknown
): void {
    const failure = `${method}: ${reason}`;
    if (InternalLog.verbosity === undefined || reportedFailures.has(failure)) {
        return;
    }
    reportedFailures.add(failure);
    try {
        const detail = error instanceof Error ? `: ${error.message}` : '';
        InternalLog.log(
            `Unable to submit flag tracking (${failure})${detail}. Ensure the native SDK supports the tracking hooks and Flags is enabled.`,
            SdkVerbosity.WARN
        );
    } catch {
        // Diagnostics must not interrupt evaluation or reject native delivery promises.
    }
}

function captureTelemetryTargetingKey(value: string | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }
    try {
        // Reject malformed UTF-16 before the bridge can replace it with another identity.
        encodeURIComponent(value);
        return value;
    } catch {
        return null;
    }
}
