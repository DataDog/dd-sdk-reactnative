/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { BufferSingleton } from '../BufferSingleton';

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
});
