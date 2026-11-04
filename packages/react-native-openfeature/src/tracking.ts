/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import type {
    EvaluationDetails,
    FlagValue,
    Hook,
    HookContext
} from '@openfeature/web-sdk';
import { Platform } from 'react-native';

import { toDdContext } from './mappers';

export interface DatadogTrackingHooksOptions {
    /** Named native Flags client used for tracking. Defaults to 'default'. */
    clientName?: string;
}

export interface DatadogTrackingHooks {
    hooks: Hook[];
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
}

export interface DatadogTrackingHook {
    hooks: Hook[];
    initialize?(): Promise<void> | void;
    shutdown?(): Promise<void> | void;
}

/** Android only. Logs exposures through native storage, consent handling, and deduplication. */
export function createDatadogExposureLoggingHook(
    options: DatadogTrackingHooksOptions = {}
): DatadogTrackingHooks {
    const clientName = options.clientName ?? 'default';
    return createHook('__ddTrackFlagExposure', (context, details) => {
        if (details.flagMetadata?.doLog !== true) {
            return;
        }
        const flag = toAssignment(details);
        if (!flag?.doLog) {
            return;
        }
        DatadogSdk.__ddTrackFlagExposure(
            clientName,
            context.flagKey,
            flag,
            toDdContext(context.context)
        );
    });
}

/** Android only. Logs every evaluation, including errors/defaults, through native aggregation. */
export function createDatadogEvaluationLoggingHook(
    options: DatadogTrackingHooksOptions = {}
): DatadogTrackingHooks {
    const clientName = options.clientName ?? 'default';
    return createHook('__ddTrackFlagEvaluationEvent', (context, details) => {
        DatadogSdk.__ddTrackFlagEvaluationEvent(
            clientName,
            context.flagKey,
            toAssignment(details),
            toDdContext(context.context),
            details.errorCode ?? (details.reason === 'ERROR' ? 'GENERAL' : null)
        );
    });
}

/** Android only. Adds successful evaluations to the current native RUM view. */
export function createDatadogRumTrackingHook(
    options: DatadogTrackingHooksOptions = {}
): DatadogTrackingHooks {
    const clientName = options.clientName ?? 'default';
    return createHook('__ddTrackFlagRumEvaluation', (context, details) => {
        if (
            !details.errorCode &&
            details.reason !== 'ERROR' &&
            details.variant != null
        ) {
            DatadogSdk.__ddTrackFlagRumEvaluation(
                clientName,
                context.flagKey,
                details.variant,
                toDdContext(context.context)
            );
        }
    });
}

export function composeDatadogTrackingHooks(
    ...trackingHooks: DatadogTrackingHook[]
): DatadogTrackingHooks {
    return {
        hooks: trackingHooks.flatMap(tracking => tracking.hooks),
        initialize: async () => {
            await Promise.all(
                trackingHooks.map(tracking =>
                    runTrackingLifecycleOperation(() => tracking.initialize?.())
                )
            );
        },
        shutdown: async () => {
            await Promise.all(
                trackingHooks.map(tracking =>
                    runTrackingLifecycleOperation(() => tracking.shutdown?.())
                )
            );
        }
    };
}

function runTrackingLifecycleOperation(
    operation: () => Promise<void> | void | undefined
): Promise<void> {
    try {
        return Promise.resolve(operation()).catch(() => {});
    } catch {
        return Promise.resolve();
    }
}

function createHook(
    method:
        | '__ddTrackFlagExposure'
        | '__ddTrackFlagEvaluationEvent'
        | '__ddTrackFlagRumEvaluation',
    record: (
        context: HookContext,
        details: EvaluationDetails<FlagValue>
    ) => void
): DatadogTrackingHooks {
    let active = false;
    let compatibilityWarningLogged = false;
    return {
        hooks: [
            {
                finally: (context, details) => {
                    if (!active) {
                        return;
                    }
                    try {
                        record(context, details);
                    } catch {
                        // Optional tracking must never change the evaluation result.
                    }
                }
            }
        ],
        initialize: async () => {
            if (Platform.OS !== 'android') {
                active = false;
                if (!compatibilityWarningLogged) {
                    compatibilityWarningLogged = true;
                    // eslint-disable-next-line no-console
                    console.warn(
                        'DATADOG: Independent flag tracking hooks are currently supported only on Android. This hook is disabled; flag evaluation is unaffected.'
                    );
                }
                return;
            }
            active = typeof DatadogSdk[method] === 'function';
            if (!active && !compatibilityWarningLogged) {
                compatibilityWarningLogged = true;
                // Older core packages may not expose InternalLog either.
                // eslint-disable-next-line no-console
                console.warn(
                    `DATADOG: Tracking hook disabled because the core SDK does not provide ${method}. Install matching versions of @datadog/mobile-react-native and @datadog/mobile-react-native-openfeature that support tracking hooks, then rebuild the native app.`
                );
            }
        },
        // Hooks do not own the shared native SDK, its consent state, or its upload pipeline.
        shutdown: async () => {
            active = false;
        }
    };
}

function toAssignment(details: EvaluationDetails<FlagValue>) {
    const allocationKey = details.flagMetadata?.allocationKey;
    if (
        details.errorCode ||
        details.reason === 'ERROR' ||
        typeof allocationKey !== 'string' ||
        typeof details.variant !== 'string'
    ) {
        return null;
    }
    const serialId = details.flagMetadata?.__dd_split_serial_id;
    return {
        allocationKey,
        variationKey: details.variant,
        doLog: details.flagMetadata?.doLog === true,
        ...(typeof serialId === 'number' || typeof serialId === 'string'
            ? { serialId: String(serialId) }
            : {})
    };
}
