/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DdSdk } from '../../foundation';
import { applyLogEventMapper, formatLogEvent } from '../eventMapper';
import type { LogEventMapper } from '../types';

describe('formatLogEvent', () => {
    it('formats a raw log without context and userInfo to a LogEvent', () => {
        expect(
            formatLogEvent(
                { message: 'original', context: {} },
                { logStatus: 'info', userInfo: {} }
            )
        ).toEqual({
            message: 'original',
            context: {},
            status: 'info',
            userInfo: {}
        });
    });

    it('formats a raw log with context and userInfo to a LogEvent', () => {
        expect(
            formatLogEvent(
                { message: 'original', context: { loggedIn: true } },
                {
                    logStatus: 'info',
                    userInfo: {
                        name: 'userName',
                        extraInfo: { loggedIn: true }
                    }
                }
            )
        ).toEqual({
            message: 'original',
            context: { loggedIn: true },
            status: 'info',
            userInfo: {
                name: 'userName',
                extraInfo: { loggedIn: true }
            }
        });
    });
});

describe('applyLogEventMapper', () => {
    it('applies the log event mapper for the editable fields', () => {
        const logEventMapper: LogEventMapper = log => {
            log.message = 'new message';
            log.context = { loggedIn: true };
            return log;
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info',
                userInfo: { extraInfo: { userType: 'admin' } }
            })
        ).toEqual({
            message: 'new message',
            context: { loggedIn: true },
            status: 'info',
            userInfo: { extraInfo: { userType: 'admin' } }
        });
    });

    it('applies the log event mapper for the editable fields when returning a new instance', () => {
        const logEventMapper: LogEventMapper = log => {
            return {
                message: 'new message',
                status: log.status,
                context: { loggedIn: true },
                userInfo: {
                    name: 'new name',
                    extraInfo: { userType: 'admin' }
                }
            };
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info',
                userInfo: {}
            })
        ).toEqual({
            message: 'new message',
            context: { loggedIn: true },
            status: 'info',
            userInfo: {}
        });
    });

    it('applies the log event mapper and prevents non-editable fields to be edited', () => {
        const logEventMapper: LogEventMapper = log => {
            // @ts-ignore
            log.status = 'fake status';
            // @ts-ignore
            log.userInfo.name = 'fake name';
            return log;
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info',
                userInfo: {}
            })
        ).toEqual({
            message: 'original',
            context: {},
            status: 'info',
            userInfo: {}
        });
    });

    it('returns the original log when the event log mapper crashes', () => {
        const logEventMapper: LogEventMapper = log => {
            log.context = { fakeProperty: 'fake value' };
            throw new Error('crashed');
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info',
                userInfo: {}
            })
        ).toEqual({
            message: 'original',
            context: {},
            status: 'info',
            userInfo: {}
        });
        expect(DdSdk.telemetryDebug).toHaveBeenCalledWith(
            'Error while running the log event mapper'
        );
    });

    it('returns null when the mappers returns null', () => {
        const logEventMapper: LogEventMapper = log => {
            return null;
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info',
                userInfo: {}
            })
        ).toBeNull();
    });
});
