/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { FlagEvaluationAggregator } from '@datadog/flagging-core';
import type { FlagEvaluationEvent } from '@datadog/flagging-core';
import type {
    EvaluationDetails,
    FlagValue,
    HookContext
} from '@openfeature/web-sdk';

import { buildTrackingConfiguration } from './configuration';
import type {
    DatadogTrackingHooksOptions,
    TrackingConfiguration
} from './configuration';
import {
    composeDatadogTrackingHooks,
    createTrackingHookController
} from './tracking';
import type { DatadogTrackingHooks, ManagedTrackingHook } from './tracking';
import { addBackgroundListener, startIntakeBatch } from './transport';

export function createFlagEvaluationLoggingHook(
    configuration: TrackingConfiguration
): ManagedTrackingHook {
    const flagEvaluationBatch = startIntakeBatch(
        configuration,
        'flagevaluation'
    );

    const aggregator = new FlagEvaluationAggregator(
        configuration.flagEvaluationTrackingInterval,
        (events: FlagEvaluationEvent[]) => {
            events.forEach(event => {
                try {
                    flagEvaluationBatch.add({
                        ...event,
                        context: {
                            ...event.context,
                            dd: {
                                ...(configuration.service && {
                                    service: configuration.service
                                }),
                                rum: {
                                    ...(configuration.applicationId && {
                                        application: {
                                            id: configuration.applicationId
                                        }
                                    })
                                }
                            }
                        }
                    });
                } catch {
                    // Tracking must not interrupt flag evaluation.
                }
            });
            // Aggregated events are already delayed by the tracking interval.
            flagEvaluationBatch.flush();
        }
    );

    aggregator.start();
    // The app may be killed in the background: send aggregated evaluations before that.
    const removeBackgroundListener = addBackgroundListener(() =>
        aggregator.flush()
    );

    return {
        shutdown: () => {
            try {
                aggregator.stop();
            } finally {
                removeBackgroundListener();
                flagEvaluationBatch.stop();
            }
        },
        // `finally` also runs for failed evaluations, such as FLAG_NOT_FOUND and TYPE_MISMATCH,
        // which skip `after`. The Datadog server SDKs use the same stage.
        finally: (
            hookContext: HookContext,
            details: EvaluationDetails<FlagValue>
        ) => {
            try {
                aggregator.addEvaluation(
                    hookContext.context,
                    details,
                    details.errorCode
                        ? details.errorMessage || details.errorCode
                        : undefined
                );
            } catch {
                // Tracking must not interrupt flag evaluation.
            }
        }
    };
}

/**
 * Create a hook that aggregates flag evaluations and sends them to Datadog from JavaScript, for
 * use with `DatadogCoreProvider`.
 *
 * The hook does not track until `initialize` resolves. Call `shutdown` to send pending
 * evaluations and release resources.
 */
export function createDatadogEvaluationLoggingHook(
    options: DatadogTrackingHooksOptions
): DatadogTrackingHooks {
    const configuration = buildTrackingConfiguration(options);
    return configuration
        ? createTrackingHookController(() =>
              createFlagEvaluationLoggingHook(configuration)
          )
        : composeDatadogTrackingHooks();
}
