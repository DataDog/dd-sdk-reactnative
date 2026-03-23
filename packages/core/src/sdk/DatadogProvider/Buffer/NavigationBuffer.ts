/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogBuffer } from './DatadogBuffer';

/**
 * Safety timeout (ms): auto-drains the buffer if `onStateChange` never fires
 * after a navigation dispatch.
 */
export const NAVIGATION_BUFFER_TIMEOUT_MS = 500;

// TODO: DEBUG LOGGING — remove before shipping
const LOG = (msg: string, ...args: any[]) =>
    // eslint-disable-next-line no-console
    console.log(`[DD NavBuffer] ${new Date().toISOString()} ${msg}`, ...args);

/**
 * An internal `DatadogBuffer` decorator that queues RUM events during a
 * navigation transition and flushes them once the new view is confirmed.
 *
 * **IMPORTANT**
 * Any changes to the public methods of this class must be reflected in
 * the interface definition of the react-navigation package.
 *
 * **Lifecycle**
 * 1. `startNavigation()` — called when a navigation action is dispatched
 *    (via the `__unsafe_action__` listener). Starts buffering all incoming
 *    RUM events and records `navigationStartTime` so the view-start can be
 *    backdated to the moment the user triggered the navigation.
 *    A safety timeout (`NAVIGATION_BUFFER_TIMEOUT_MS`) automatically calls
 *    `endNavigation()` if the state-change callback never fires.
 * 2. `prepareEndNavigation()` — called just before `DdRum.startView()`.
 *    Stops accepting new events into the queue (so `startView` itself passes
 *    through immediately) but keeps the queue intact and preserves
 *    `navigationStartTime` for the caller to read.
 * 3. `flush()` — called after `startView()` resolves. Drains queued events
 *    to the inner buffer so they are attributed to the new view.
 * 4. `endNavigation()` — stop-and-drain shortcut used by the safety timeout,
 *    teardown (`stopTrackingViews`), and any path where no `startView` fires
 *    (background state, predicate returning false, undefined route, etc.).
 *
 * **Integration point**
 * `BufferSingleton.onInitialization()` installs a `NavigationBuffer` wrapping
 * a `PassThroughBuffer` as the active SDK buffer. The react-navigation package
 * accesses it via `getGlobalInstance` using the shared
 * `'com.datadog.reactnative.buffer_singleton'` key — no public export needed.
 *
 * @internal
 */
export class NavigationBuffer extends DatadogBuffer {
    private innerBuffer: DatadogBuffer;
    private isNavigating = false;
    private callbackQueue: Array<() => void> = [];
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private _navigationStartTime: number | null = null;

    /**
     * The timestamp (ms since epoch) captured when startNavigation() was called.
     * Use this as the timestampMs for DdRum.startView() so the view start reflects
     * when the user initiated navigation, not when onStateChange fired.
     * Null when no navigation is in progress.
     */
    get navigationStartTime(): number | null {
        return this._navigationStartTime;
    }

    constructor(innerBuffer: DatadogBuffer) {
        super();
        this.innerBuffer = innerBuffer;
        LOG('constructed', { innerBuffer: innerBuffer.constructor.name });
    }

    addCallback = (callback: () => Promise<void>): Promise<void> => {
        if (!this.isNavigating) {
            LOG('addCallback → passthrough');
            return this.innerBuffer.addCallback(callback);
        }
        LOG(
            'addCallback → QUEUED, queueLength now',
            this.callbackQueue.length + 1
        );
        this.callbackQueue.push(() => {
            this.innerBuffer.addCallback(callback);
        });
        return Promise.resolve();
    };

    addCallbackReturningId = (
        callback: () => Promise<string>
    ): Promise<string> => {
        if (!this.isNavigating) {
            LOG('addCallbackReturningId → passthrough');
            return this.innerBuffer.addCallbackReturningId(callback);
        }
        LOG(
            'addCallbackReturningId → QUEUED, queueLength now',
            this.callbackQueue.length + 1
        );
        return new Promise<string>(resolve => {
            this.callbackQueue.push(() => {
                this.innerBuffer.addCallbackReturningId(callback).then(resolve);
            });
        });
    };

    addCallbackWithId = (
        callback: (id: string) => Promise<void>,
        id: string
    ): Promise<void> => {
        if (!this.isNavigating) {
            LOG('addCallbackWithId → passthrough, id:', id);
            return this.innerBuffer.addCallbackWithId(callback, id);
        }
        LOG(
            'addCallbackWithId → QUEUED, id:',
            id,
            'queueLength now',
            this.callbackQueue.length + 1
        );
        return new Promise<void>(resolve => {
            this.callbackQueue.push(() => {
                this.innerBuffer.addCallbackWithId(callback, id).then(resolve);
            });
        });
    };

    drain = (): void => {
        LOG(
            'drain() called, queueLength:',
            this.callbackQueue.length,
            'isNavigating:',
            this.isNavigating
        );
        this.flushQueue();
        this.innerBuffer.drain();
    };

    startNavigation = (): void => {
        const wasAlreadyNavigating = this.isNavigating;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
        // Only capture the start time on the first navigation start; preserve it
        // across rapid re-navigations so the timestamp reflects the original intent.
        if (!wasAlreadyNavigating) {
            this._navigationStartTime = Date.now();
        }
        this.isNavigating = true;
        this.timeoutId = setTimeout(() => {
            LOG(
                `timeout fired after ${NAVIGATION_BUFFER_TIMEOUT_MS}ms — calling endNavigation`
            );
            this.endNavigation();
        }, NAVIGATION_BUFFER_TIMEOUT_MS);
        LOG('startNavigation()', {
            wasAlreadyNavigating,
            navigationStartTime: this._navigationStartTime,
            queueLength: this.callbackQueue.length,
            timeoutMs: NAVIGATION_BUFFER_TIMEOUT_MS
        });
    };

    /**
     * Stop accepting new events into the buffer and cancel any pending timeout,
     * WITHOUT draining the queue. Use this before calling DdRum.startView() so
     * that startView() itself passes through immediately. Then call flush() after
     * startView resolves to send queued events to the now-active view.
     *
     * Contrast with endNavigation(), which stops AND drains immediately (used by
     * timeout auto-drain and teardown paths).
     */
    prepareEndNavigation = (): void => {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isNavigating = false;
        LOG(
            'prepareEndNavigation() — stopped buffering, queue preserved, navigationStartTime:',
            this._navigationStartTime,
            'queueLength:',
            this.callbackQueue.length
        );
        // Note: _navigationStartTime is intentionally kept until flush() so the
        // caller can still read it after prepareEndNavigation() returns.
    };

    /**
     * Drain the queued events to the inner buffer. Call this after startView()
     * resolves to flush buffered events to the new view.
     *
     * Safe to call when the queue is empty (no-op).
     */
    flush = (): void => {
        const now = Date.now();
        const lag =
            this._navigationStartTime !== null
                ? now - this._navigationStartTime
                : null;
        LOG(
            'flush() called — draining',
            this.callbackQueue.length,
            'queued events | navigationStartTime:',
            this._navigationStartTime,
            '| now:',
            now,
            '| lag since nav start:',
            lag !== null ? `${lag}ms` : 'n/a'
        );
        this._navigationStartTime = null;
        this.flushQueue();
    };

    /**
     * Stop buffering and drain the queue immediately. Used by:
     * - Timeout auto-drain (navigation never completed)
     * - Teardown (stopTrackingViews)
     */
    endNavigation = (): void => {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isNavigating = false;
        const now = Date.now();
        const lag =
            this._navigationStartTime !== null
                ? now - this._navigationStartTime
                : null;
        LOG(
            'endNavigation() — draining',
            this.callbackQueue.length,
            'queued events | navigationStartTime:',
            this._navigationStartTime,
            '| now:',
            now,
            '| lag since nav start:',
            lag !== null ? `${lag}ms` : 'n/a'
        );
        this._navigationStartTime = null;
        this.flushQueue();
        LOG('endNavigation() done');
    };

    private flushQueue = (): void => {
        const pending = this.callbackQueue;
        this.callbackQueue = [];
        LOG('flushQueue() executing', pending.length, 'queued callbacks');
        for (const callback of pending) {
            callback();
        }
    };
}
