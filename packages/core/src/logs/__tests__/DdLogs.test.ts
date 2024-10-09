/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdSdkReactNativeConfiguration } from '../../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../../DdSdkReactNative';
import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import type { DdNativeLogsType } from '../../nativeModulesTypes';
import { ErrorSource } from '../../rum/types';
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

        it('log with error events can be filtered by error source', async () => {
            const logEventMapper: LogEventMapper = logEvent => {
                if (logEvent.source === ErrorSource.CONSOLE) {
                    return null;
                }

                return logEvent;
            };

            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.error(
                'message',
                'kind',
                'message',
                'stacktrace',
                {},
                'fingerprint',
                ErrorSource.CONSOLE
            );

            // Call with filtered ErrorSource.CONSOLE type
            expect(NativeModules.DdLogs.error).not.toHaveBeenCalled();
            expect(InternalLog.log).toHaveBeenCalledWith(
                'error log dropped by log mapper: "message"',
                'debug'
            );

            // Call with valid ErrorSource.CUSTOM type
            await DdLogs.error(
                'message',
                'kind',
                'message',
                'stacktrace',
                {},
                'fingerprint',
                ErrorSource.CUSTOM
            );

            expect(NativeModules.DdLogs.errorWithError).toHaveBeenCalledWith(
                'message',
                'kind',
                'message',
                'stacktrace',
                {
                    '_dd.error.fingerprint': 'fingerprint',
                    '_dd.error.source_type': 'react-native'
                }
            );
            expect(InternalLog.log).toHaveBeenCalledWith(
                'Tracking error log "message"',
                'debug'
            );
        });

        it('console errors can be filtered with mappers when trackErrors=true', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true // Track Errors
            );

            // Register log event mapper to filter console log events
            configuration.logEventMapper = logEvent => {
                if (logEvent.source === ErrorSource.CONSOLE) {
                    return null;
                }

                return logEvent;
            };

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            console.error('console-error-message');
            expect(NativeModules.DdLogs.error).not.toHaveBeenCalled();
            expect(InternalLog.log).toHaveBeenCalledWith(
                'error log dropped by log mapper: "console-error-message"',
                'debug'
            );

            // Call with valid ErrorSource.CUSTOM type
            await DdLogs.error(
                'message',
                'kind',
                'message',
                'stacktrace',
                {},
                'fingerprint',
                ErrorSource.CUSTOM
            );

            expect(NativeModules.DdLogs.errorWithError).toHaveBeenCalledWith(
                'message',
                'kind',
                'message',
                'stacktrace',
                {
                    '_dd.error.fingerprint': 'fingerprint',
                    '_dd.error.source_type': 'react-native'
                }
            );
            expect(InternalLog.log).toHaveBeenCalledWith(
                'Tracking error log "message"',
                'debug'
            );
        });

        it('console errors are reported in logs when trackErrors=true', async () => {
            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId,
                false,
                false,
                true // Track Errors
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await DdSdkReactNative.initialize(configuration);

            console.error('console-error-message');
            expect(NativeModules.DdLogs.error).not.toHaveBeenCalled();
            expect(InternalLog.log).toHaveBeenCalledWith(
                'Tracking error log "console-error-message"',
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

        it.each([
            [
                'kind',
                'message',
                'stacktrace',
                { context: 'value' },
                'custom-fingerprint-0'
            ],
            // 1 argument is undefined
            [
                undefined,
                'message',
                'stacktrace',
                { context: 'value' },
                'custom-fingerprint-1'
            ],
            [
                'kind',
                undefined,
                'stacktrace',
                { context: 'value' },
                'custom-fingerprint-2'
            ],
            [
                'kind',
                'message',
                undefined,
                { context: 'value' },
                'custom-fingerprint-3'
            ],
            ['kind', 'message', 'stacktrace', undefined, 'custom-fingerprint'],
            // 2 arguments are undefined
            [
                undefined,
                undefined,
                'stacktrace',
                { context: 'value' },
                'custom-fingerprint-4'
            ],
            [
                undefined,
                'message',
                undefined,
                { context: 'value' },
                'custom-fingerprint-5'
            ],
            [
                undefined,
                'message',
                'stacktrace',
                undefined,
                'custom-fingerprint-6'
            ],
            [
                'kind',
                undefined,
                undefined,
                { context: 'value' },
                'custom-fingerprint-7'
            ],
            [
                'kind',
                undefined,
                'stacktrace',
                undefined,
                'custom-fingerprint-8'
            ],
            ['kind', 'message', undefined, undefined, 'custom-fingerprint-9'],
            // 3 arguments are undefined
            [
                undefined,
                undefined,
                'stacktrace',
                undefined,
                'custom-fingerprint-10'
            ],
            [
                undefined,
                'message',
                undefined,
                undefined,
                'custom-fingerprint-11'
            ],
            ['kind', undefined, undefined, undefined, 'custom-fingerprint-12'],
            [
                undefined,
                undefined,
                undefined,
                { context: 'value' },
                'custom-fingerprint-13'
            ]
        ])(
            'sends error info with custom fingerprint when provided for %s %s %s %s %s',
            async (
                errorKind,
                errorMessage,
                stacktrace,
                context,
                fingerprint
            ) => {
                await DdLogs.info(
                    'message',
                    errorKind,
                    errorMessage,
                    stacktrace,
                    context,
                    fingerprint
                );
                expect(NativeModules.DdLogs.infoWithError).toHaveBeenCalledWith(
                    'message',
                    errorKind,
                    errorMessage,
                    stacktrace,
                    {
                        ...(context || {}),
                        '_dd.error.source_type': 'react-native',
                        '_dd.error.fingerprint': fingerprint
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

    describe('when SDK is not initialized', () => {
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

    describe('log context', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            DdLogs.unregisterLogEventMapper();
        });

        describe('debug logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.debug('message', undefined);
                expect(NativeModules.DdLogs.debug).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.debug('message', [1, 2, 3]);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );
                expect(
                    NativeModules.DdLogs.debug
                ).toHaveBeenCalledWith('message', { context: [1, 2, 3] });
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.debug('message', obj);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );
                expect(NativeModules.DdLogs.debug).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.debug('message', { test: '123' });
                expect(
                    NativeModules.DdLogs.debug
                ).toHaveBeenCalledWith('message', { test: '123' });
            });
        });

        describe('warn logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.warn('message', undefined);
                expect(NativeModules.DdLogs.warn).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.warn('message', [1, 2, 3]);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );
                expect(
                    NativeModules.DdLogs.warn
                ).toHaveBeenCalledWith('message', { context: [1, 2, 3] });
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.warn('message', obj);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );
                expect(NativeModules.DdLogs.warn).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.warn('message', { test: '123' });
                expect(
                    NativeModules.DdLogs.warn
                ).toHaveBeenCalledWith('message', { test: '123' });
            });
        });

        describe('info logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.info('message', undefined);
                expect(NativeModules.DdLogs.info).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.info('message', [1, 2, 3]);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );
                expect(
                    NativeModules.DdLogs.info
                ).toHaveBeenCalledWith('message', { context: [1, 2, 3] });
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.info('message', obj);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );
                expect(NativeModules.DdLogs.info).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.info('message', { test: '123' });
                expect(
                    NativeModules.DdLogs.info
                ).toHaveBeenCalledWith('message', { test: '123' });
            });
        });

        describe('error logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.error('message', undefined);
                expect(NativeModules.DdLogs.error).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.error('message', [1, 2, 3]);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );
                expect(
                    NativeModules.DdLogs.error
                ).toHaveBeenCalledWith('message', { context: [1, 2, 3] });
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.error('message', obj);
                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );
                expect(NativeModules.DdLogs.error).toHaveBeenCalledWith(
                    'message',
                    {}
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.error('message', { test: '123' });
                expect(
                    NativeModules.DdLogs.error
                ).toHaveBeenCalledWith('message', { test: '123' });
            });
        });
    });

    describe('log with error context', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            DdLogs.unregisterLogEventMapper();
        });

        describe('debug logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.debug(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    undefined
                );
                expect(
                    NativeModules.DdLogs.debugWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.debug('message', 'kind', 'message', 'stacktrace', [
                    1,
                    2,
                    3
                ]);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(
                    NativeModules.DdLogs.debugWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    {
                        context: [1, 2, 3],
                        '_dd.error.source_type': 'react-native'
                    }
                );
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.debug(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    obj
                );

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(
                    NativeModules.DdLogs.debugWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.debug('message', 'kind', 'message', 'stacktrace', {
                    test: '123'
                });
                expect(
                    NativeModules.DdLogs.debugWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { test: '123', '_dd.error.source_type': 'react-native' }
                );
            });
        });

        describe('warn logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.warn(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    undefined
                );
                expect(
                    NativeModules.DdLogs.warnWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.warn('message', 'kind', 'message', 'stacktrace', [
                    1,
                    2,
                    3
                ]);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(NativeModules.DdLogs.warnWithError).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    {
                        context: [1, 2, 3],
                        '_dd.error.source_type': 'react-native'
                    }
                );
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.warn(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    obj
                );

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(
                    NativeModules.DdLogs.warnWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.warn('message', 'kind', 'message', 'stacktrace', {
                    test: '123'
                });
                expect(
                    NativeModules.DdLogs.warnWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { test: '123', '_dd.error.source_type': 'react-native' }
                );
            });
        });

        describe('info logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.info(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    undefined
                );
                expect(
                    NativeModules.DdLogs.infoWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.info('message', 'kind', 'message', 'stacktrace', [
                    1,
                    2,
                    3
                ]);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(NativeModules.DdLogs.infoWithError).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    {
                        context: [1, 2, 3],
                        '_dd.error.source_type': 'react-native'
                    }
                );
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.info(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    obj
                );

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(
                    NativeModules.DdLogs.infoWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.info('message', 'kind', 'message', 'stacktrace', {
                    test: '123'
                });
                expect(
                    NativeModules.DdLogs.infoWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { test: '123', '_dd.error.source_type': 'react-native' }
                );
            });
        });

        describe('error logs', () => {
            it('native context is empty W context is undefined', async () => {
                await DdLogs.error(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    undefined
                );
                expect(
                    NativeModules.DdLogs.errorWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is an object with nested property W context is an array', async () => {
                await DdLogs.error('message', 'kind', 'message', 'stacktrace', [
                    1,
                    2,
                    3
                ]);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(
                    NativeModules.DdLogs.errorWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    {
                        context: [1, 2, 3],
                        '_dd.error.source_type': 'react-native'
                    }
                );
            });

            it('native context is empty W context is raw type', async () => {
                const obj: any = 123;
                await DdLogs.error(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    obj
                );

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(
                    NativeModules.DdLogs.errorWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { '_dd.error.source_type': 'react-native' }
                );
            });

            it('native context is unmodified W context is a valid object', async () => {
                await DdLogs.error('message', 'kind', 'message', 'stacktrace', {
                    test: '123'
                });
                expect(
                    NativeModules.DdLogs.errorWithError
                ).toHaveBeenCalledWith(
                    'message',
                    'kind',
                    'message',
                    'stacktrace',
                    { test: '123', '_dd.error.source_type': 'react-native' }
                );
            });
        });
    });
});
