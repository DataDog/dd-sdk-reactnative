/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

let fetchProxyCallDepth = 0;
let resourceTrackingDisabledDepth = 0;

/**
 * Calls the original Fetch implementation while marking its synchronous work.
 * XHR-backed Fetch implementations create and send their XMLHttpRequest before
 * returning a Promise, so the XHR proxy can avoid reporting that request twice.
 */
export const callOriginalFetch = <T>(callback: () => T): T => {
    fetchProxyCallDepth += 1;
    try {
        return callback();
    } finally {
        fetchProxyCallDepth -= 1;
    }
};

export const isRunningWithinFetchProxy = (): boolean => {
    return fetchProxyCallDepth > 0;
};

/** Excludes only the requests started synchronously by this callback. */
export const callWithoutResourceTracking = <T>(callback: () => T): T => {
    resourceTrackingDisabledDepth += 1;
    try {
        return callOriginalFetch(callback);
    } finally {
        resourceTrackingDisabledDepth -= 1;
    }
};

export const isResourceTrackingDisabled = (): boolean =>
    resourceTrackingDisabledDepth > 0;
