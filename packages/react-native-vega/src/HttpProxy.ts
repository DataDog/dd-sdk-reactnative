/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeEventEmitter } from 'react-native';

import NativeDdSdk from './turbo-modules/NativeDdSdk';

/**
 * Listens for HTTP request events emitted by the C++ SDK's upload thread
 * and forwards them using fetch(). Sends the HTTP status code back to C++
 * via DdSdk.httpResponse().
 *
 * Call startHttpProxy() after SDK initialization to begin forwarding.
 */
export function startHttpProxy(): () => void {
    const emitter = new NativeEventEmitter();

    const subscription = emitter.addListener(
        'ddHttpRequest',
        async (event: {
            requestId: string;
            url: string;
            headers: string;
            body: string;
        }) => {
            let statusCode = 0;
            try {
                // Parse headers from wire format ("Key: Value\nKey2: Value2\n")
                const headerLines = event.headers
                    .split('\n')
                    .filter(line => line.includes(':'));
                const headersInit: Record<string, string> = {};
                for (const line of headerLines) {
                    const colonIdx = line.indexOf(':');
                    const key = line.substring(0, colonIdx).trim();
                    const value = line.substring(colonIdx + 1).trim();
                    headersInit[key] = value;
                }

                const response = await fetch(event.url, {
                    method: 'POST',
                    headers: headersInit,
                    body: event.body
                });
                statusCode = response.status;
            } catch (error) {
                // Network errors are reported as status 0 so C++ treats them as retryable.
                statusCode = 0;
            }

            try {
                await NativeDdSdk.httpResponse(event.requestId, statusCode);
            } catch (error) {
                // If httpResponse fails, the C++ side times out and retries.
            }
        }
    );

    return () => subscription.remove();
}
