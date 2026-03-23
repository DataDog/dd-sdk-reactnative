/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    NavigationBuffer,
    NAVIGATION_BUFFER_TIMEOUT_MS
} from '../NavigationBuffer';
import { PassThroughBuffer } from '../PassThroughBuffer';

const flushPromises = () =>
    new Promise<void>(jest.requireActual('timers').setImmediate);

describe('NavigationBuffer', () => {
    describe('passthrough when not navigating', () => {
        it('forwards addCallback to inner buffer immediately', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            await buffer.addCallback(cb);

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('forwards addCallbackReturningId to inner buffer immediately', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());

            const result = await buffer.addCallbackReturningId(() =>
                Promise.resolve('realId')
            );

            expect(result).toBe('realId');
        });

        it('forwards addCallbackWithId to inner buffer immediately', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            await buffer.addCallbackWithId(cb, 'someId');

            expect(cb).toHaveBeenCalledWith('someId');
        });
    });

    describe('holds events during navigation', () => {
        it('queues addCallback during navigation and drains on endNavigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);
            expect(cb).not.toHaveBeenCalled();

            buffer.endNavigation();
            await flushPromises();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('queues addCallbackReturningId during navigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            let resolved = false;

            buffer.startNavigation();
            const idPromise = buffer.addCallbackReturningId(() =>
                Promise.resolve('nativeId')
            );
            idPromise.then(() => {
                resolved = true;
            });

            await flushPromises();
            expect(resolved).toBe(false);

            buffer.endNavigation();
            await flushPromises();

            const id = await idPromise;
            expect(id).toBe('nativeId');
            expect(resolved).toBe(true);
        });

        it('queues addCallbackWithId during navigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallbackWithId(cb, 'testId');
            expect(cb).not.toHaveBeenCalled();

            buffer.endNavigation();
            await flushPromises();
            expect(cb).toHaveBeenCalledWith('testId');
        });
    });

    describe('endNavigation', () => {
        it('drains callbacks in FIFO order', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const order: number[] = [];

            buffer.startNavigation();
            buffer.addCallback(async () => {
                order.push(1);
            });
            buffer.addCallback(async () => {
                order.push(2);
            });
            buffer.addCallback(async () => {
                order.push(3);
            });

            buffer.endNavigation();
            await flushPromises();

            expect(order).toEqual([1, 2, 3]);
        });

        it('is a no-op when not navigating', () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());

            expect(() => buffer.endNavigation()).not.toThrow();
        });
    });

    describe('timeout auto-drain', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('auto-drains after NAVIGATION_BUFFER_TIMEOUT_MS', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);

            jest.advanceTimersByTime(NAVIGATION_BUFFER_TIMEOUT_MS);
            await flushPromises();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('does not double-drain if endNavigation called before timeout', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);

            buffer.endNavigation();
            await flushPromises();
            expect(cb).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(NAVIGATION_BUFFER_TIMEOUT_MS);
            await flushPromises();
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    describe('rapid navigation', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('resets timeout on second startNavigation, preserves queue', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb1 = jest.fn().mockResolvedValue(undefined);
            const cb2 = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb1);

            jest.advanceTimersByTime(400);

            buffer.startNavigation();
            buffer.addCallback(cb2);

            jest.advanceTimersByTime(400);
            await flushPromises();
            expect(cb1).not.toHaveBeenCalled();
            expect(cb2).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);
            await flushPromises();
            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });

        it('drains all events from multiple navigation windows on endNavigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb1 = jest.fn().mockResolvedValue(undefined);
            const cb2 = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb1);

            buffer.startNavigation();
            buffer.addCallback(cb2);

            buffer.endNavigation();
            await flushPromises();

            expect(cb1).toHaveBeenCalledTimes(1);
            expect(cb2).toHaveBeenCalledTimes(1);
        });
    });

    describe('drain', () => {
        it('flushes navigation queue when called directly', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);

            buffer.drain();
            await flushPromises();

            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    describe('prepareEndNavigation + flush (two-phase pattern)', () => {
        it('prepareEndNavigation stops buffering without draining the queue', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);

            buffer.prepareEndNavigation();
            await flushPromises();

            // Queue is not drained yet
            expect(cb).not.toHaveBeenCalled();
        });

        it('flush drains the queue after prepareEndNavigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);

            buffer.prepareEndNavigation();
            buffer.flush();
            await flushPromises();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('callbacks added after prepareEndNavigation pass through immediately (not buffered)', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.prepareEndNavigation();

            // This simulates DdRum.startView() — must pass through, not be queued
            await buffer.addCallback(cb);

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('flush after prepareEndNavigation drains in FIFO order', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const order: number[] = [];

            buffer.startNavigation();
            buffer.addCallback(async () => {
                order.push(1);
            });
            buffer.addCallback(async () => {
                order.push(2);
            });

            buffer.prepareEndNavigation();
            // startView equivalent — passes through immediately
            await buffer.addCallback(async () => {
                order.push(3);
            });

            buffer.flush();
            await flushPromises();

            // Buffered events (1, 2) flush after the startView equivalent (3)
            expect(order).toEqual([3, 1, 2]);
        });

        it('endNavigation called after prepareEndNavigation drains remaining queue', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);
            buffer.prepareEndNavigation();

            // Teardown calls endNavigation — should still drain
            buffer.endNavigation();
            await flushPromises();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('does not double-drain if flush called after endNavigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cb = jest.fn().mockResolvedValue(undefined);

            buffer.startNavigation();
            buffer.addCallback(cb);
            buffer.endNavigation();
            await flushPromises();
            expect(cb).toHaveBeenCalledTimes(1);

            buffer.flush();
            await flushPromises();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('back-to-back nav: flush only drains events from the first navigation', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cbA1 = jest.fn().mockResolvedValue(undefined);
            const cbA2 = jest.fn().mockResolvedValue(undefined);

            // First navigation
            buffer.startNavigation();
            buffer.addCallback(cbA1);
            buffer.prepareEndNavigation();

            // Second navigation fires before flush() runs
            buffer.startNavigation();
            buffer.addCallback(cbA2);

            // Flush for first navigation — only A1 should drain
            buffer.flush();
            await flushPromises();
            expect(cbA1).toHaveBeenCalledTimes(1);
            expect(cbA2).not.toHaveBeenCalled();

            // Complete second navigation
            buffer.prepareEndNavigation();
            buffer.flush();
            await flushPromises();
            expect(cbA2).toHaveBeenCalledTimes(1);
        });

        it('endNavigation after prepareEndNavigation drains both pending and queued events', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());
            const cbA1 = jest.fn().mockResolvedValue(undefined);
            const cbA2 = jest.fn().mockResolvedValue(undefined);

            // First navigation
            buffer.startNavigation();
            buffer.addCallback(cbA1);
            buffer.prepareEndNavigation();

            // Second navigation starts before flush()
            buffer.startNavigation();
            buffer.addCallback(cbA2);

            // Teardown / timeout path — endNavigation drains everything
            buffer.endNavigation();
            await flushPromises();

            expect(cbA1).toHaveBeenCalledTimes(1);
            expect(cbA2).toHaveBeenCalledTimes(1);
        });
    });

    describe('ID linking across navigation hold', () => {
        it('resolves addCallbackReturningId with the real ID after drain', async () => {
            const buffer = new NavigationBuffer(new PassThroughBuffer());

            buffer.startNavigation();
            const idPromise = buffer.addCallbackReturningId(() =>
                Promise.resolve('nativeId')
            );

            buffer.endNavigation();
            await flushPromises();

            const resolvedId = await idPromise;
            expect(resolvedId).toBe('nativeId');
        });
    });

    describe('exported constant', () => {
        it('exports NAVIGATION_BUFFER_TIMEOUT_MS as 500', () => {
            expect(NAVIGATION_BUFFER_TIMEOUT_MS).toBe(500);
        });
    });
});
