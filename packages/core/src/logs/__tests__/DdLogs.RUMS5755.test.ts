/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Reproduction tests for RUMS-5755: Missing Android Tablet Logs
 *
 * Root cause: In SDK v2.12.3, DdLogs silently dropped logs when the native
 * SDK was not initialized (isInitialized() guard + try/catch silent drop).
 * Combined with the customer's error-swallowing .catch() handler during
 * SDK init, this created a permanent log black hole on tablets where
 * initialization failed.
 *
 * The fix in v3.1.2 (PR #1167) introduced bufferVoidNativeCall, which
 * buffers log calls in a BoundedBuffer before initialization and drains
 * them once the SDK is ready. The isInitialized() guards were removed
 * from the native DdLogsImplementation.kt.
 *
 * These tests prove the fix is in place in the current codebase (v3.3.0).
 */

import { NativeModules } from 'react-native';

import { BufferSingleton } from '../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdLogs } from '../DdLogs';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

const flushPromises = () =>
    new Promise<void>(jest.requireActual('timers').setImmediate);

describe('RUMS-5755: Log buffering prevents silent log loss', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        BufferSingleton.reset();
        DdLogs.unregisterLogEventMapper();
    });

    describe('logs are buffered before SDK initialization (v3.x fix)', () => {
        /**
         * Test 1: Prove that in the current version, calling DdLogs.warn()
         * before BufferSingleton.onInitialization() does NOT call the native
         * module immediately -- it buffers the call instead.
         *
         * In v2.12.3, this would have called the native module directly,
         * which would reject with SDK_NOT_INITIALIZED_MESSAGE, and the JS
         * layer would silently swallow the error.
         */
        it('buffers a single warn log call before initialization instead of dropping it', async () => {
            // GIVEN: SDK is NOT initialized (BufferSingleton is in BoundedBuffer state)
            // WHEN: We call DdLogs.warn before initialization
            await DdLogs.warn('tablet log message', { location: 'store-42' });

            // THEN: The native module should NOT have been called yet
            // (the call is buffered, not dropped or executed)
            expect(NativeModules.DdLogs.warn).not.toHaveBeenCalled();

            // WHEN: SDK initialization completes
            BufferSingleton.onInitialization();
            await flushPromises();

            // THEN: The buffered log should now be drained to the native module
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledWith(
                'tablet log message',
                {
                    location: 'store-42'
                }
            );
        });

        /**
         * Test 2: Prove that multiple sequential DdLogs calls before init
         * are ALL buffered and drained -- none are silently dropped.
         *
         * In v2.12.3, ALL of these calls would be silently dropped because
         * the native SDK rejects with SDK_NOT_INITIALIZED_MESSAGE and the
         * JS catch handler swallows the error.
         */
        it('buffers multiple sequential log calls and drains all of them after initialization', async () => {
            // GIVEN: SDK is NOT initialized
            // WHEN: We call DdLogs 5 times before initialization
            await DdLogs.warn('log 1', { index: 1 });
            await DdLogs.warn('log 2', { index: 2 });
            await DdLogs.info('log 3', { index: 3 });
            await DdLogs.error('log 4', { index: 4 });
            await DdLogs.debug('log 5', { index: 5 });

            // THEN: No native calls should have been made yet
            expect(NativeModules.DdLogs.warn).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.info).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.error).not.toHaveBeenCalled();
            expect(NativeModules.DdLogs.debug).not.toHaveBeenCalled();

            // WHEN: SDK initialization completes
            BufferSingleton.onInitialization();
            await flushPromises();

            // THEN: All 5 buffered logs should be drained
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(2);
            expect(NativeModules.DdLogs.warn).toHaveBeenNthCalledWith(
                1,
                'log 1',
                { index: 1 }
            );
            expect(NativeModules.DdLogs.warn).toHaveBeenNthCalledWith(
                2,
                'log 2',
                { index: 2 }
            );
            expect(NativeModules.DdLogs.info).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.info).toHaveBeenCalledWith('log 3', {
                index: 3
            });
            expect(NativeModules.DdLogs.error).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.error).toHaveBeenCalledWith('log 4', {
                index: 4
            });
            expect(NativeModules.DdLogs.debug).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.debug).toHaveBeenCalledWith('log 5', {
                index: 5
            });
        });

        /**
         * Test 3: Prove that DdLogs.warn() resolves without error even before
         * initialization. The caller never sees a rejection.
         *
         * This is critical: in v2.12.3, the promise also resolved (the catch
         * swallowed the error), but the log was DROPPED. In v3.x, the promise
         * resolves AND the log is buffered for later delivery.
         */
        it('resolves the promise without error even before initialization', async () => {
            // GIVEN: SDK is NOT initialized
            // WHEN/THEN: Calling DdLogs.warn should resolve, never reject
            await expect(
                DdLogs.warn('pre-init log', {})
            ).resolves.toBeUndefined();

            await expect(
                DdLogs.info('pre-init info', {})
            ).resolves.toBeUndefined();

            await expect(
                DdLogs.error('pre-init error', {})
            ).resolves.toBeUndefined();

            await expect(
                DdLogs.debug('pre-init debug', {})
            ).resolves.toBeUndefined();
        });
    });

    describe('logs pass through directly after SDK initialization', () => {
        /**
         * Test 4: Prove that after initialization, logs go directly to the
         * native module via PassThroughBuffer (no buffering delay).
         */
        it('sends logs directly to native module after initialization', async () => {
            // GIVEN: SDK IS initialized
            BufferSingleton.onInitialization();

            // WHEN: We call DdLogs.warn
            await DdLogs.warn('post-init log', { location: 'store-1' });

            // THEN: The native module should be called immediately
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(1);
            expect(
                NativeModules.DdLogs.warn
            ).toHaveBeenCalledWith('post-init log', { location: 'store-1' });
        });
    });

    describe('v2.12.3 behavior simulation: silent log drop without buffering', () => {
        /**
         * Test 5: Prove that the buffer prevents native calls before init.
         *
         * In v2.12.3, DdLogs called the native module directly (no buffer).
         * If the native SDK was not initialized, NativeDdLogs rejected with
         * SDK_NOT_INITIALIZED_MESSAGE and the JS catch handler silently
         * swallowed it -- the log was permanently lost.
         *
         * In v3.x, the buffer intercepts the call so the native module is
         * never invoked until after initialization. This test proves that
         * the buffer prevents premature native calls entirely.
         */
        it('buffer prevents native calls before initialization, avoiding the v2.12.3 silent drop', async () => {
            // GIVEN: SDK is NOT initialized (BoundedBuffer is active)
            // WHEN: We call DdLogs.warn before initialization
            await DdLogs.warn('lost tablet log', {});

            // THEN: The native module was NOT called (buffer intercepted)
            // In v2.12.3 without the buffer, the native module WOULD have
            // been called here, received a rejection, and silently dropped
            expect(NativeModules.DdLogs.warn).not.toHaveBeenCalled();

            // WHEN: Now we initialize and drain the buffer
            BufferSingleton.onInitialization();
            await flushPromises();

            // THEN: The native module IS called during drain, when the SDK
            // is ready. The log is delivered, not dropped.
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(1);
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledWith(
                'lost tablet log',
                {}
            );
        });

        /**
         * Test 6: Prove that the buffer prevents the session-lifetime log
         * black hole that existed in v2.12.3. In the old version, once
         * init failed, ALL subsequent logs for the entire session were
         * silently dropped.
         *
         * In v3.x, all pre-init logs are buffered and delivered on drain.
         */
        it('all logs in a session are buffered, preventing the permanent black hole', async () => {
            // GIVEN: SDK is NOT initialized (simulating tablet init failure)
            const logMessages = [
                'order-placed',
                'inventory-check',
                'payment-processed',
                'receipt-generated',
                'session-end'
            ];

            // WHEN: Multiple business-critical logs are sent before init
            for (const msg of logMessages) {
                await DdLogs.warn(msg, {});
            }

            // THEN: None reached the native layer yet (all buffered)
            expect(NativeModules.DdLogs.warn).not.toHaveBeenCalled();

            // WHEN: Initialization eventually succeeds (e.g., retry)
            BufferSingleton.onInitialization();
            await flushPromises();

            // THEN: All 5 logs are recovered from the buffer
            expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(5);
            logMessages.forEach((msg, index) => {
                expect(NativeModules.DdLogs.warn).toHaveBeenNthCalledWith(
                    index + 1,
                    msg,
                    {}
                );
            });
        });
    });

    describe('logWithError buffering', () => {
        /**
         * Test 7: Prove that logWithError calls are also buffered before
         * initialization, not just simple log calls.
         */
        it('buffers logWithError calls before initialization', async () => {
            // GIVEN: SDK is NOT initialized
            // WHEN: We call DdLogs.error with error details before init
            await DdLogs.error(
                'crash on tablet',
                'NetworkError',
                'proxy unreachable',
                'at NativePerfectCore.obtainProxySettings:44',
                { tablet: true }
            );

            // THEN: The native module should NOT have been called
            expect(NativeModules.DdLogs.errorWithError).not.toHaveBeenCalled();

            // WHEN: SDK initialization completes
            BufferSingleton.onInitialization();
            await flushPromises();

            // THEN: The buffered error log should be drained
            expect(NativeModules.DdLogs.errorWithError).toHaveBeenCalledTimes(
                1
            );
            expect(NativeModules.DdLogs.errorWithError).toHaveBeenCalledWith(
                'crash on tablet',
                'NetworkError',
                'proxy unreachable',
                'at NativePerfectCore.obtainProxySettings:44',
                expect.objectContaining({
                    tablet: true,
                    '_dd.error.source_type': 'react-native'
                })
            );
        });
    });
});
