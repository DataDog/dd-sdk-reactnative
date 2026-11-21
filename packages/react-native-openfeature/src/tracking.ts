/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    EvaluationDetails,
    FlagValue,
    Hook,
    HookContext
} from '@openfeature/web-sdk';

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

/** Logs exposures through native storage, consent handling, and deduplication. */
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
        getDatadogSdk().__ddTrackFlagExposure(
            clientName,
            context.flagKey,
            flag,
            toDdContext(context.context)
        );
    });
}

/** Adds successful evaluations to the current native RUM view. */
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
            getDatadogSdk().__ddTrackFlagRumEvaluation(
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
    method: '__ddTrackFlagExposure' | '__ddTrackFlagRumEvaluation',
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
            try {
                active = typeof getDatadogSdk()[method] === 'function';
            } catch {
                active = false;
            }
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

function getDatadogSdk(): typeof import('@datadog/mobile-react-native') {
    // Evaluation-only imports must not resolve the native SDK, even through /rules-based.
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    return require('@datadog/mobile-react-native');
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
