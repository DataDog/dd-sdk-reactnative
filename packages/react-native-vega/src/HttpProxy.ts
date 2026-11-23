/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    callWithoutResourceTracking,
    getGlobalInstance
} from '@datadog/mobile-react-native/internal';
import { NativeEventEmitter } from 'react-native';

import type { DdSdk } from './turbo-modules/NativeDdSdk';
import { getNativeDdSdk } from './turbo-modules/NativeDdSdk';

interface HttpProxyLifecycle {
    activeCleanup?: () => void;
    operations: Promise<void>;
}

const lifecycle = getGlobalInstance<HttpProxyLifecycle>(
    'com.datadog.reactnative.vega.http_proxy',
    () => ({ operations: Promise.resolve() })
);

// Leave time to report a retryable failure before native's 30-second wait ends.
const HTTP_REQUEST_TIMEOUT_MS = 25_000;

const fetchWithDeadline = async (
    url: string,
    options: Parameters<typeof fetch>[1],
    requests: Set<() => void>
): Promise<Response | undefined> => {
    const controller =
        typeof AbortController === 'undefined'
            ? undefined
            : new AbortController();
    let completeCancellation: () => void = () => undefined;
    const cancellation = new Promise<undefined>(resolve => {
        completeCancellation = () => resolve(undefined);
    });
    let cancelled = false;
    const cancel = () => {
        if (cancelled) {
            return;
        }
        cancelled = true;
        completeCancellation();
        try {
            controller?.abort();
        } catch {
            // Cancellation still settles if this Fetch cannot be aborted.
        }
    };
    const timeout = setTimeout(cancel, HTTP_REQUEST_TIMEOUT_MS);
    requests.add(cancel);
    try {
        return await Promise.race([
            callWithoutResourceTracking(() =>
                fetch(url, {
                    ...options,
                    ...(controller ? { signal: controller.signal } : {})
                })
            ),
            cancellation
        ]);
    } finally {
        clearTimeout(timeout);
        requests.delete(cancel);
    }
};

const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const result = lifecycle.operations.then(operation);
    lifecycle.operations = result.catch(() => undefined);
    return result;
};

/**
 * Forwards native uploads through fetch without recording them as RUM resources.
 * Await startup before enabling native uploads. Starting again replaces the
 * previous session; its cleanup cannot stop the replacement session.
 */
export async function startHttpProxy(): Promise<() => void> {
    lifecycle.activeCleanup?.();
    let active = true;
    let nativeSdk: DdSdk | null = null;
    let subscription: { remove(): void } | undefined;
    const requests = new Set<() => void>();

    const cleanup = () => {
        if (!active) {
            return;
        }
        active = false;
        if (lifecycle.activeCleanup === cleanup) {
            lifecycle.activeCleanup = undefined;
        }
        // Queue teardown before a replacement session can enable its emitter.
        enqueue(async () => {
            try {
                await nativeSdk?.stopHttpProxy();
            } catch {
                // Teardown must not interrupt the host app.
            }
        });
        try {
            subscription?.remove();
        } catch {
            // The native module may already be unavailable.
        }
        requests.forEach(request => {
            try {
                request();
            } catch {
                // Some Fetch implementations do not support cancellation.
            }
        });
        requests.clear();
    };
    lifecycle.activeCleanup = cleanup;

    try {
        await enqueue(async () => {
            if (!active) {
                return;
            }
            nativeSdk = getNativeDdSdk();
            if (!nativeSdk) {
                cleanup();
                return;
            }
            const sdk = nativeSdk;
            subscription = new NativeEventEmitter().addListener(
                'ddHttpRequest',
                async (event: {
                    requestId: string;
                    url: string;
                    headers: string;
                    body: string;
                }) => {
                    if (!active) {
                        return;
                    }
                    let statusCode = 0;
                    try {
                        const headers: Record<string, string> = {};
                        event.headers.split('\n').forEach(line => {
                            const colon = line.indexOf(':');
                            if (colon >= 0) {
                                headers[
                                    line.substring(0, colon).trim()
                                ] = line.substring(colon + 1).trim();
                            }
                        });
                        const response = await fetchWithDeadline(
                            event.url,
                            {
                                method: 'POST',
                                headers,
                                body: event.body
                            },
                            requests
                        );
                        statusCode = response?.status ?? 0;
                    } catch {
                        // Status 0 makes network errors and timeouts retryable.
                    }
                    try {
                        // Native arbitrates response versus cancellation and
                        // ignores IDs whose requests have already completed.
                        await sdk.httpResponse(event.requestId, statusCode);
                    } catch {
                        // Native times out or teardown cancels the waiter.
                    }
                }
            );
            await sdk.startHttpProxy();
        });
    } catch {
        cleanup();
    }
    return cleanup;
}
