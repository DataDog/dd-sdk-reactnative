/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { callWithoutResourceTracking } from '@datadog/mobile-react-native/internal';
import { NativeEventEmitter } from 'react-native';

import type { DdSdk } from './turbo-modules/NativeDdSdk';
import { getNativeDdSdk } from './turbo-modules/NativeDdSdk';

let activeCleanup: (() => void) | undefined;
let operations = Promise.resolve();

const enqueue = (operation: () => Promise<void>): Promise<void> => {
    const result = operations.then(operation);
    operations = result.catch(() => undefined);
    return result;
};

/**
 * Forwards native uploads through fetch without recording them as RUM resources.
 * Await startup before enabling native uploads. Starting again replaces the
 * previous session; its cleanup cannot stop the replacement session.
 */
export async function startHttpProxy(): Promise<() => void> {
    activeCleanup?.();
    let active = true;
    let nativeSdk: DdSdk | null = null;
    let subscription: { remove(): void } | undefined;
    const requests = new Set<AbortController>();

    const cleanup = () => {
        if (!active) {
            return;
        }
        active = false;
        if (activeCleanup === cleanup) {
            activeCleanup = undefined;
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
                request.abort();
            } catch {
                // Some Fetch implementations do not support cancellation.
            }
        });
        requests.clear();
    };
    activeCleanup = cleanup;

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
                    let controller: AbortController | undefined;
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
                        if (typeof AbortController !== 'undefined') {
                            controller = new AbortController();
                            requests.add(controller);
                        }
                        const response = await callWithoutResourceTracking(() =>
                            fetch(event.url, {
                                method: 'POST',
                                headers,
                                body: event.body,
                                ...(controller
                                    ? { signal: controller.signal }
                                    : {})
                            })
                        );
                        statusCode = response.status;
                    } catch {
                        // Status 0 makes network failures retryable in native.
                    } finally {
                        if (controller) {
                            requests.delete(controller);
                        }
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
