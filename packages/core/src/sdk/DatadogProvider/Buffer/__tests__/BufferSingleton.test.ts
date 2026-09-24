/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { BufferSingleton } from '../BufferSingleton';
import { NavigationBuffer } from '../NavigationBuffer';

const flushPromises = () =>
    new Promise<void>(jest.requireActual('timers').setImmediate);

describe('BufferSingleton', () => {
    afterEach(() => {
        BufferSingleton.reset();
    });
    describe('addCallback', () => {
        it('drains callbacks and replaces the buffer by a pass through on initialization', async () => {
            const fakeCallback = jest.fn();
            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId');
            const callbackWithId = jest.fn();

            // registering callbacks
            BufferSingleton.getInstance().addCallback(fakeCallback);
            const bufferId = await BufferSingleton.getInstance().addCallbackReturningId(
                callbackReturningId
            );
            BufferSingleton.getInstance().addCallbackWithId(
                callbackWithId,
                bufferId
            );

            expect(fakeCallback).not.toHaveBeenCalled();

            // initialization
            BufferSingleton.onInitialization();
            await flushPromises();

            expect(fakeCallback).toHaveBeenCalledTimes(1);

            // registering a new callback
            BufferSingleton.getInstance().addCallback(fakeCallback);

            expect(fakeCallback).toHaveBeenCalledTimes(2);
            expect(callbackReturningId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledWith('callbackId');
        });
    });

    describe('NavigationBuffer wiring', () => {
        afterEach(() => {
            BufferSingleton.reset();
        });

        it('getNavigationBuffer returns null before initialization', () => {
            expect(BufferSingleton.getNavigationBuffer()).toBeNull();
        });

        it('getNavigationBuffer returns NavigationBuffer after initialization', () => {
            BufferSingleton.onInitialization();
            const navBuffer = BufferSingleton.getNavigationBuffer();
            expect(navBuffer).toBeInstanceOf(NavigationBuffer);
        });

        it('getInstance returns the NavigationBuffer after initialization', () => {
            BufferSingleton.onInitialization();
            const instance = BufferSingleton.getInstance();
            expect(instance).toBeInstanceOf(NavigationBuffer);
        });

        it('NavigationBuffer passes through callbacks after initialization (not navigating)', async () => {
            BufferSingleton.onInitialization();
            const cb = jest.fn().mockResolvedValue(undefined);
            BufferSingleton.getInstance().addCallback(cb);
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('NavigationBuffer holds callbacks during navigation after initialization', async () => {
            BufferSingleton.onInitialization();
            const navBuffer = BufferSingleton.getNavigationBuffer()!;
            const cb = jest.fn().mockResolvedValue(undefined);

            navBuffer.startNavigation();
            BufferSingleton.getInstance().addCallback(cb);
            expect(cb).not.toHaveBeenCalled();

            navBuffer.endNavigation();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('reset clears navigationBuffer reference', () => {
            BufferSingleton.onInitialization();
            expect(BufferSingleton.getNavigationBuffer()).not.toBeNull();

            BufferSingleton.reset();
            expect(BufferSingleton.getNavigationBuffer()).toBeNull();
        });
    });
});
