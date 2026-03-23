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
    // Snapshot of callbackQueue taken at prepareEndNavigation() time.
    // Kept separate so that a back-to-back navigation that calls startNavigation()
    // before flush() runs cannot mix its events into the pending flush for the
    // previous view. flush() drains only this snapshot; new events from the
    // subsequent navigation accumulate in the fresh callbackQueue.
    private _pendingFlushQueue: Array<() => void> = [];
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
    }

    addCallback = (callback: () => Promise<void>): Promise<void> => {
        if (!this.isNavigating) {
            return this.innerBuffer.addCallback(callback);
        }
        this.callbackQueue.push(() => {
            this.innerBuffer.addCallback(callback);
        });
        return Promise.resolve();
    };

    addCallbackReturningId = (
        callback: () => Promise<string>
    ): Promise<string> => {
        if (!this.isNavigating) {
            return this.innerBuffer.addCallbackReturningId(callback);
        }
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
            return this.innerBuffer.addCallbackWithId(callback, id);
        }
        return new Promise<void>(resolve => {
            this.callbackQueue.push(() => {
                this.innerBuffer.addCallbackWithId(callback, id).then(resolve);
            });
        });
    };

    drain = (): void => {
        this.drainAllQueues();
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
            this.endNavigation();
        }, NAVIGATION_BUFFER_TIMEOUT_MS);
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
        // Snapshot the current queue so flush() only drains events that belong
        // to this navigation. Events arriving after this point (e.g. from a
        // back-to-back navigation that re-enables buffering) go into the fresh
        // callbackQueue and will not be included in the upcoming flush().
        this._pendingFlushQueue = this.callbackQueue;
        this.callbackQueue = [];
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
        this._navigationStartTime = null;
        const toFlush = this._pendingFlushQueue;
        this._pendingFlushQueue = [];
        for (const callback of toFlush) {
            callback();
        }
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
        this._navigationStartTime = null;
        // Drain both queues: _pendingFlushQueue may be non-empty if a
        // prepareEndNavigation() was followed by a back-to-back navigation
        // before flush() ran.
        this.drainAllQueues();
    };

    private drainAllQueues = (): void => {
        const pendingFlush = this._pendingFlushQueue;
        this._pendingFlushQueue = [];
        for (const callback of pendingFlush) {
            callback();
        }
        const queued = this.callbackQueue;
        this.callbackQueue = [];
        for (const callback of queued) {
            callback();
        }
    };
}
