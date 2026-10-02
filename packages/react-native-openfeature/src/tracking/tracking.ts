/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Hook } from '@openfeature/web-sdk';

/**
 * Hooks and lifecycle methods returned by `composeDatadogTrackingHooks`.
 */
export interface DatadogTrackingHooks {
    hooks: Hook[];
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
}

/**
 * A Datadog tracking hook controller. Register `hooks` with OpenFeature and call `initialize`
 * before evaluating flags. Controllers without a lifecycle, such as RUM tracking, omit it.
 */
export interface DatadogTrackingHook {
    hooks: Hook[];
    initialize?(): Promise<void> | void;
    shutdown?(): Promise<void> | void;
}

export interface ManagedTrackingHook extends Hook {
    shutdown(): void;
}

/**
 * Wraps a hook whose resources (timers, batches, subscriptions) are created by `initialize` and
 * released by `shutdown`. The returned hook is a no-op while tracking is not initialized.
 */
export function createTrackingHookController(
    start: () => ManagedTrackingHook | Promise<ManagedTrackingHook>
): DatadogTrackingHooks {
    let activeHook: ManagedTrackingHook | undefined;
    let lifecycle = Promise.resolve();

    return {
        hooks: [
            {
                after: (...args) => activeHook?.after?.(...args),
                finally: (...args) => activeHook?.finally?.(...args)
            }
        ],
        initialize: () => {
            // Serialize setup and teardown so shutdown also waits for a pending setup.
            lifecycle = lifecycle.then(() =>
                runTrackingLifecycleOperation(async () => {
                    if (!activeHook) {
                        activeHook = await start();
                    }
                })
            );
            return lifecycle;
        },
        shutdown: () => {
            lifecycle = lifecycle.then(() =>
                runTrackingLifecycleOperation(() => {
                    const hook = activeHook;
                    activeHook = undefined;
                    hook?.shutdown();
                })
            );
            return lifecycle;
        }
    };
}

/**
 * Combine Datadog tracking hook controllers into a single set of hooks and lifecycle methods.
 * It does not initialize resources or register hooks with OpenFeature.
 */
export function composeDatadogTrackingHooks(
    ...trackingHooks: DatadogTrackingHook[]
): DatadogTrackingHooks {
    return {
        hooks: trackingHooks.reduce<Hook[]>((hooks, trackingHook) => {
            hooks.push(...trackingHook.hooks);
            return hooks;
        }, []),
        initialize: async () => {
            await Promise.all(
                trackingHooks.map(trackingHook =>
                    runTrackingLifecycleOperation(() =>
                        trackingHook.initialize?.()
                    )
                )
            );
        },
        shutdown: async () => {
            await Promise.all(
                trackingHooks.map(trackingHook =>
                    runTrackingLifecycleOperation(() =>
                        trackingHook.shutdown?.()
                    )
                )
            );
        }
    };
}

/**
 * Run a lifecycle operation without letting its failure interrupt flag evaluation.
 */
export function runTrackingLifecycleOperation(
    operation: () => Promise<void> | void | undefined
): Promise<void> {
    try {
        return Promise.resolve(operation()).catch(() => {});
    } catch {
        return Promise.resolve();
    }
}
