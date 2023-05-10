/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import type { DdNativeLogsType } from '../../nativeModulesTypes';
import { DdLogs } from '../DdLogs';
import type { LogEventMapper } from '../types';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('DdLogs', () => {
    describe('log event mapper', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            DdLogs.unregisterLogEventMapper();
        });

        it('registers event mapper and maps logs', async () => {
            const logEventMapper: LogEventMapper = log => {
                return {
                    message: 'new message',
                    context: { newContext: 'context' },
                    status: 'info',
                    userInfo: {}
                };
            };
            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.info('original message', {});
            expect(
                NativeModules.DdLogs.info
            ).toHaveBeenCalledWith('new message', { newContext: 'context' });

            expect(InternalLog.log).toHaveBeenNthCalledWith(
                1,
                'Tracking info log "new message"',
                'debug'
            );

            await DdLogs.debug(
                'original message',
                'TypeError',
                'error message',
                'stack',
                {}
            );
            expect(NativeModules.DdLogs.debugWithError).toHaveBeenCalledWith(
                'new message',
                undefined,
                undefined,
                undefined,
                {
                    newContext: 'context',
                    '_dd.error.source_type': 'react-native'
                }
            );
            expect(InternalLog.log).toHaveBeenNthCalledWith(
                2,
                'Tracking debug log "new message"',
                'debug'
            );
        });

        it('registers event mapper and maps logs with errors', async () => {
            const logEventMapper: LogEventMapper = log => {
                log.message = 'new message';
                if (log.errorKind) {
                    log.errorKind = 'NewErrorType';
                }
                if (log.errorMessage) {
                    log.errorMessage = 'new error message';
                }
                if (log.stacktrace) {
                    log.stacktrace = 'new stacktrace';
                }
                log.context = { newContext: 'context' };
                return log;
            };
            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.info('original message', {});
            expect(
                NativeModules.DdLogs.info
            ).toHaveBeenCalledWith('new message', { newContext: 'context' });
            await DdLogs.info(
                'original message',
                'TypeError',
                'error message',
                'stack',
                {}
            );
            expect(NativeModules.DdLogs.infoWithError).toHaveBeenCalledWith(
                'new message',
                'NewErrorType',
                'new error message',
                'new stacktrace',
                {
                    newContext: 'context',
                    '_dd.error.source_type': 'react-native'
                }
            );
        });

        it('sends initial log if no event mapper is registered', async () => {
            await DdLogs.info('original message', {});
            expect(NativeModules.DdLogs.info).toHaveBeenCalledWith(
                'original message',
                {}
            );
        });

        it('drops the event if the mapper returns null', async () => {
            const logEventMapper: LogEventMapper = log => {
                return null;
            };
            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.info('original message', {});
            expect(NativeModules.DdLogs.info).not.toHaveBeenCalled();
            expect(InternalLog.log).toHaveBeenCalledWith(
                'info log dropped by log mapper: "original message"',
                'debug'
            );
        });
    });

    describe('log with error', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            DdLogs.unregisterLogEventMapper();
        });
        it.each([
            ['kind', 'message', 'stacktrace', { context: 'value' }],
            // 1 argument is undefined
            [undefined, 'message', 'stacktrace', { context: 'value' }],
            ['kind', undefined, 'stacktrace', { context: 'value' }],
            ['kind', 'message', undefined, { context: 'value' }],
            ['kind', 'message', 'stacktrace', undefined],
            // 2 arguments are undefined
            [undefined, undefined, 'stacktrace', { context: 'value' }],
            [undefined, 'message', undefined, { context: 'value' }],
            [undefined, 'message', 'stacktrace', undefined],
            ['kind', undefined, undefined, { context: 'value' }],
            ['kind', undefined, 'stacktrace', undefined],
            ['kind', 'message', undefined, undefined],
            // 3 arguments are undefined
            [undefined, undefined, 'stacktrace', undefined],
            [undefined, 'message', undefined, undefined],
            ['kind', undefined, undefined, undefined],
            [undefined, undefined, undefined, { context: 'value' }]
        ])(
            'sends error info when provided for %s %s %s %s',
            async (errorKind, errorMessage, stacktrace, context) => {
                await DdLogs.info(
                    'message',
                    errorKind,
                    errorMessage,
                    stacktrace,
                    context
                );
                expect(NativeModules.DdLogs.infoWithError).toHaveBeenCalledWith(
                    'message',
                    errorKind,
                    errorMessage,
                    stacktrace,
                    {
                        ...(context || {}),
                        '_dd.error.source_type': 'react-native'
                    }
                );
            }
        );

        it('does not send error info when no error and no context is passed', async () => {
            await DdLogs.info(
                'message',
                undefined,
                undefined,
                undefined,
                undefined
            );
            expect(NativeModules.DdLogs.info).toHaveBeenCalledWith(
                'message',
                {}
            );
        });
    });

    describe.only('when SDK is not initialized', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            DdLogs.unregisterLogEventMapper();
        });

        it('does not crash and warns user', async () => {
            (NativeModules.DdLogs.info as jest.MockedFunction<
                DdNativeLogsType['debug']
            >).mockRejectedValueOnce(
                new Error('DD_INTERNAL_LOG_SENT_BEFORE_SDK_INIT')
            );
            const consoleSpy = jest.spyOn(console, 'warn');
            await DdLogs.info('original message', {});
            expect(consoleSpy).toHaveBeenCalledWith(
                'DATADOG: Dropping info log as the SDK is not initialized yet: "original message"'
            );
        });
    });
});
