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
// Match the browser SDK's batch defaults.
const DEFAULT_FLUSH_TIMEOUT_MS = 30000;
const DEFAULT_MAX_EVENTS = 50;

export interface IntakeBatch {
    add(event: object): void;
    flush(): void;
    stop(): void;
}

/**
 * Build an intake URL. Parameters are sent in the query string, as the browser SDK does, so a
 * `ddforward` proxy only needs to forward the URL and body.
 *
 * The core SDK's RUM resource tracking ignores requests to these URLs.
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
 * reaches `maxEvents`, when the flush timeout expires, when the app leaves the foreground, and on
 * `stop`. Failed requests are dropped.
 */
export function startIntakeBatch(
    configuration: TrackingConfiguration,
    trackType: IntakeTrackType,
    {
        flushTimeoutMs = DEFAULT_FLUSH_TIMEOUT_MS,
        maxEvents = DEFAULT_MAX_EVENTS
    }: { flushTimeoutMs?: number; maxEvents?: number } = {}
): IntakeBatch {
    let events: string[] = [];
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
        send(buildIntakeUrl(configuration, trackType), body);
    };

    const removeAppStateListener = addBackgroundListener(flush);

    return {
        add: (event: object) => {
            events.push(JSON.stringify(event));
            if (events.length >= maxEvents) {
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
