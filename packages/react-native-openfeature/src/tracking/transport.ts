/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { version } from '../version';

import type { TrackingConfiguration } from './configuration';

export type IntakeTrackType = 'exposures' | 'flagevaluation';

const SOURCE = 'react-native';
// Match the browser SDK's batch defaults (browser-core's createBatch and createFlushController).
const DEFAULT_FLUSH_TIMEOUT_MS = 30000;
const DEFAULT_MAX_EVENTS = 50;
const DEFAULT_BATCH_BYTES_LIMIT = 16 * 1024;
const DEFAULT_MESSAGE_BYTES_LIMIT = 256 * 1024;

export interface IntakeBatch {
    add(event: object): void;
    flush(): void;
    stop(): void;
}

/**
 * Build an intake URL. Parameters are sent in the query string, as the browser SDK does, so a
 * `ddforward` proxy only needs to forward the URL and body.
 *
 * The core SDK's RUM resource tracking ignores requests to these URLs. It matches on
 * `ddsource=react-native` being the first parameter, so keep it first.
 */
export function buildIntakeUrl(
    configuration: TrackingConfiguration,
    trackType: IntakeTrackType
): string {
    const path = `/api/v2/${trackType}`;
    const parameters = [
        `ddsource=${SOURCE}`,
        `dd-api-key=${encodeURIComponent(configuration.clientToken)}`,
        `dd-evp-origin-version=${encodeURIComponent(version)}`,
        `dd-evp-origin=${SOURCE}`,
        `dd-request-id=${generateUUID()}`
    ].join('&');

    if (configuration.proxy) {
        return `${configuration.proxy}?ddforward=${encodeURIComponent(
            `${path}?${parameters}`
        )}`;
    }
    return `https://${buildIntakeHost(
        configuration.site
    )}${path}?${parameters}`;
}

export function buildIntakeHost(site: string): string {
    const domainParts = site.split('.');
    const extension = domainParts.pop();
    return `browser-intake-${domainParts.join('-')}.${extension}`;
}

/**
 * Batch events and send them to the intake as newline-delimited JSON. A batch is sent when it
 * reaches `maxEvents` or `batchBytesLimit`, when the flush timeout expires, when the app leaves the
 * foreground, and on `stop`. Events of `messageBytesLimit` or more and failed requests are dropped.
 */
export function startIntakeBatch(
    configuration: TrackingConfiguration,
    trackType: IntakeTrackType,
    {
        flushTimeoutMs = DEFAULT_FLUSH_TIMEOUT_MS,
        maxEvents = DEFAULT_MAX_EVENTS,
        batchBytesLimit = DEFAULT_BATCH_BYTES_LIMIT,
        messageBytesLimit = DEFAULT_MESSAGE_BYTES_LIMIT
    }: {
        flushTimeoutMs?: number;
        maxEvents?: number;
        batchBytesLimit?: number;
        messageBytesLimit?: number;
    } = {}
): IntakeBatch {
    let events: string[] = [];
    let batchBytes = 0;
    let flushTimeout: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
        if (flushTimeout !== undefined) {
            clearTimeout(flushTimeout);
            flushTimeout = undefined;
        }
        if (events.length === 0) {
            return;
        }
        const body = events.join('\n');
        events = [];
        batchBytes = 0;
        send(buildIntakeUrl(configuration, trackType), body);
    };

    const removeAppStateListener = addBackgroundListener(flush);

    return {
        add: (event: object) => {
            const message = JSON.stringify(event);
            const messageBytes = computeBytesCount(message);
            if (messageBytes >= messageBytesLimit) {
                return;
            }
            // As in the browser SDK, the check before adding leaves out the newline separator,
            // which is counted once the event is added.
            if (batchBytes + messageBytes >= batchBytesLimit) {
                flush();
            }
            batchBytes += (events.length > 0 ? 1 : 0) + messageBytes;
            events.push(message);
            if (events.length >= maxEvents || batchBytes >= batchBytesLimit) {
                flush();
            } else if (flushTimeout === undefined) {
                flushTimeout = setTimeout(flush, flushTimeoutMs);
            }
        },
        flush,
        stop: () => {
            try {
                flush();
            } finally {
                removeAppStateListener();
            }
        }
    };
}

function send(url: string, body: string): void {
    try {
        // Read fetch at send time: the core SDK may install its resource tracking proxy later.
        globalThis
            .fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body
            })
            .catch(() => {});
    } catch {
        // Tracking must not interrupt flag evaluation.
    }
}

export function addBackgroundListener(onBackground: () => void): () => void {
    const listener = (state: AppStateStatus) => {
        if (state !== 'active') {
            onBackground();
        }
    };
    try {
        const subscription = AppState.addEventListener('change', listener);
        return () => {
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            } else {
                // React Native < 0.65 does not return a subscription.
                (AppState as {
                    removeEventListener?: (
                        type: 'change',
                        listener: (state: AppStateStatus) => void
                    ) => void;
                }).removeEventListener?.('change', listener);
            }
        };
    } catch {
        return () => {};
    }
}

// eslint-disable-next-line no-control-regex
const HAS_MULTI_BYTES_CHARACTERS = /[^\u0000-\u007F]/;

/**
 * UTF-8 byte length of a string. Older Hermes and JSC engines have no `TextEncoder`.
 */
export function computeBytesCount(value: string): number {
    if (!HAS_MULTI_BYTES_CHARACTERS.test(value)) {
        return value.length;
    }
    let bytes = 0;
    for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        if (code < 0x80) {
            bytes += 1;
        } else if (code < 0x800) {
            bytes += 2;
        } else if (
            code >= 0xd800 &&
            code <= 0xdbff &&
            index + 1 < value.length &&
            (value.charCodeAt(index + 1) & 0xfc00) === 0xdc00
        ) {
            // A surrogate pair encodes one 4-byte code point.
            bytes += 4;
            index++;
        } else {
            bytes += 3;
        }
    }
    return bytes;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        character => {
            const random = (Math.random() * 16) | 0;
            const value = character === 'x' ? random : (random & 0x3) | 0x8;
            return value.toString(16);
        }
    );
}
