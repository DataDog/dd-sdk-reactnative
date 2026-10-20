/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import NativeDdFlags from '../specs/NativeDdFlags';
import type { Spec } from '../specs/NativeDdFlags';

import { processEvaluationContext } from './internal';
import type { FlagCacheEntry } from './internal';
import type { EvaluationContext } from './types';

/** @internal Used by the matching-version OpenFeature tracking hooks. */
export function __ddTrackFlagExposure(
    clientName: string,
    key: string,
    flag: FlagCacheEntry,
    context: EvaluationContext
): void {
    const captured = processEvaluationContext(context);
    submit(native =>
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
    flag: FlagCacheEntry | null,
    context: EvaluationContext,
    errorCode: string | null
): void {
    const captured = processEvaluationContext(context);
    submit(native =>
        native.trackEvaluationEvent(
            clientName,
            key,
            flag,
            captured.targetingKey,
            captured.attributes ?? {},
            errorCode
        )
    );
}

function submit(operation: (native: Spec) => Promise<void>): void {
    // Submit immediately. Evaluation must not wait for native acknowledgment or upload.
    try {
        if (!NativeDdFlags) {
            logTrackingFailure();
            return;
        }
        operation(NativeDdFlags).catch(logTrackingFailure);
    } catch {
        logTrackingFailure();
    }
}

function logTrackingFailure(): void {
    InternalLog.log(
        'Unable to submit flag tracking. Ensure the native SDK supports the tracking hooks and Flags is enabled.',
        SdkVerbosity.WARN
    );
}
