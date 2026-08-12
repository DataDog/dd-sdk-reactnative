/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

interface CoreRumResourceBridge {
    startResource(
        key: string,
        method: string,
        url: string,
        context?: object,
        timestampMs?: number
    ): Promise<void>;
    stopResource(
        key: string,
        statusCode: number,
        kind: string,
        size?: number,
        context?: object,
        timestampMs?: number,
        resourceContext?: XMLHttpRequest
    ): Promise<void>;
}

const activeUrls = new Map<string, number>();
const ignoredResourceKeys = new Set<string>();
const patchedRumInstances = new WeakSet<object>();

export const trackInternalResource = (url: string): (() => void) => {
    activeUrls.set(url, (activeUrls.get(url) ?? 0) + 1);
    let isActive = true;

    return () => {
        if (!isActive) {
            return;
        }
        isActive = false;

        const activeCount = activeUrls.get(url) ?? 0;
        if (activeCount <= 1) {
            activeUrls.delete(url);
        } else {
            activeUrls.set(url, activeCount - 1);
        }
    };
};

export const patchCoreRumResourceTracking = (
    rum: CoreRumResourceBridge
): void => {
    if (patchedRumInstances.has(rum)) {
        return;
    }
    patchedRumInstances.add(rum);

    const originalStartResource = rum.startResource;
    const originalStopResource = rum.stopResource;

    rum.startResource = (key, method, url, context, timestampMs) => {
        if (activeUrls.has(url)) {
            ignoredResourceKeys.add(key);
            return Promise.resolve();
        }

        return originalStartResource.call(
            rum,
            key,
            method,
            url,
            context,
            timestampMs
        );
    };

    rum.stopResource = (
        key,
        statusCode,
        kind,
        size,
        context,
        timestampMs,
        resourceContext
    ) => {
        if (ignoredResourceKeys.delete(key)) {
            return Promise.resolve();
        }

        return originalStopResource.call(
            rum,
            key,
            statusCode,
            kind,
            size,
            context,
            timestampMs,
            resourceContext
        );
    };
};
