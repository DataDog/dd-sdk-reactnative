/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getGlobalInstance } from '../../../../../utils/singletonUtils';

const state = getGlobalInstance(
    'com.datadog.reactnative.rum.resource_tracking.fetch_proxy_state',
    () => ({ fetchProxyCallDepth: 0, resourceTrackingDisabledDepth: 0 })
);

/**
 * Calls the original Fetch implementation while marking its synchronous work.
 * XHR-backed Fetch implementations create and send their XMLHttpRequest before
 * returning a Promise, so the XHR proxy can avoid reporting that request twice.
 */
export const callOriginalFetch = <T>(callback: () => T): T => {
    state.fetchProxyCallDepth += 1;
    try {
        return callback();
    } finally {
        state.fetchProxyCallDepth -= 1;
    }
};

export const isRunningWithinFetchProxy = (): boolean => {
    return state.fetchProxyCallDepth > 0;
};

/** Excludes only the requests started synchronously by this callback. */
export const callWithoutResourceTracking = <T>(callback: () => T): T => {
    state.resourceTrackingDisabledDepth += 1;
    try {
        return callOriginalFetch(callback);
    } finally {
        state.resourceTrackingDisabledDepth -= 1;
    }
};

export const isResourceTrackingDisabled = (): boolean =>
    state.resourceTrackingDisabledDepth > 0;
