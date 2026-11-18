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

/** @internal Used by the matching-version OpenFeature tracking hooks. */
export function __ddTrackFlagExposure(
    clientName: string,
    key: string,
    flag: FlagTrackingAssignment,
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
export function __ddTrackFlagRumEvaluation(
    clientName: string,
    key: string,
    variant: string,
    context: EvaluationContext
): void {
    const captured = processEvaluationContext(context);
    submit(native =>
        native.trackRumEvaluation(
            clientName,
            key,
            variant,
            captured.targetingKey,
            captured.attributes ?? {}
        )
    );
}

function submit(operation: (native: DdNativeFlagsType) => Promise<void>): void {
    // Submit immediately. Evaluation must not wait for native acknowledgment or upload.
    try {
        const native = getNativeDdFlags();
        if (!native) {
            logTrackingFailure();
            return;
        }
        operation(native).catch(logTrackingFailure);
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
