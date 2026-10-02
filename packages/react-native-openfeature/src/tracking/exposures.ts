/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    LRUInMemoryAssignmentCache,
    createExposureEvent,
    timeStampNow
} from '@datadog/flagging-core';
import type {
    AssignmentCache,
    ExposureEvent,
    ExposureEventWithTimestamp
} from '@datadog/flagging-core';
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
import { createTrackingHookController } from './tracking';
import type { DatadogTrackingHook, ManagedTrackingHook } from './tracking';
import { startIntakeBatch } from './transport';

// Matches the native Feature Flags SDKs' exposure cache size.
const EXPOSURE_CACHE_SIZE = 5000;
const CORE_CONFIGURATION_ID_METADATA_KEY = '__dd_core_configuration_id';

export interface DatadogExposureLoggingHook extends DatadogTrackingHook {
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
}

type ExposureCacheEntry = ExposureEvent & {
    __dd_core_configuration_id?: string;
};

export function createExposureLoggingHook(
    configuration: TrackingConfiguration,
    exposureCache: AssignmentCache
): ManagedTrackingHook {
    const exposuresBatch = startIntakeBatch(configuration, 'exposures');

    return {
        shutdown: () => exposuresBatch.stop(),
        after: (
            hookContext: HookContext,
            details: EvaluationDetails<FlagValue>
        ) => {
            const timestamp = timeStampNow();
            const exposureEvent = createExposureEvent(
                hookContext.context,
                details
            );
            if (!exposureEvent) {
                return;
            }
            const exposureCacheEntry = getExposureCacheEntry(
                exposureEvent,
                details
            );
            if (exposureCache.has(exposureCacheEntry)) {
                return;
            }

            try {
                const exposureEventWithTimestamp: ExposureEventWithTimestamp = {
                    ...exposureEvent,
                    ...(configuration.service
                        ? { service: configuration.service }
                        : {}),
                    rum: {
                        ...(configuration.applicationId && {
                            application: { id: configuration.applicationId }
                        })
                    },
                    timestamp
                };
                exposuresBatch.add(exposureEventWithTimestamp);
                // Only cache once the exposure is batched.
                exposureCache.set(exposureCacheEntry);
            } catch {
                // Tracking must not interrupt flag evaluation.
            }
        }
    };
}

/**
 * Create a hook that sends exposures to Datadog from JavaScript, for use with
 * `DatadogCoreProvider`. Exposures are deduplicated in memory per subject and flag.
 *
 * The hook does not track until `initialize` resolves. Call `shutdown` to send pending
 * exposures and release resources.
 */
export function createDatadogExposureLoggingHook(
    options: DatadogTrackingHooksOptions
): DatadogExposureLoggingHook {
    const configuration = buildTrackingConfiguration(options);
    if (!configuration) {
        return {
            hooks: [],
            initialize: () => Promise.resolve(),
            shutdown: () => Promise.resolve()
        };
    }

    // Keep deduplication across shutdown and a later initialize, as the browser SDK does.
    const exposureCache = new LRUInMemoryAssignmentCache(EXPOSURE_CACHE_SIZE);

    return createTrackingHookController(() =>
        createExposureLoggingHook(configuration, exposureCache)
    );
}

function getExposureCacheEntry(
    exposureEvent: ExposureEvent,
    details: EvaluationDetails<FlagValue>
): ExposureCacheEntry {
    // DatadogCoreProvider identifies its configuration, so replacing the configuration lets the
    // new configuration's exposures through.
    const coreConfigurationId =
        details.flagMetadata?.[CORE_CONFIGURATION_ID_METADATA_KEY];
    return typeof coreConfigurationId === 'string'
        ? {
              ...exposureEvent,
              __dd_core_configuration_id: coreConfigurationId
          }
        : exposureEvent;
}
