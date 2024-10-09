/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ErrorSource } from '../../rum/types';
import { formatRawLogToLogEvent } from '../eventMapper';

describe('formatRawLogToLogEvent', () => {
    it('formats a raw log without context and userInfo to a LogEvent', () => {
        expect(
            formatRawLogToLogEvent(
                { message: 'original', context: {}, status: 'info' },
                { userInfo: {}, attributes: {} }
            )
        ).toEqual({
            message: 'original',
            context: {},
            status: 'info',
            userInfo: {},
            attributes: {}
        });
    });

    it('formats a raw log with context, userInfo and attributes to a LogEvent', () => {
        expect(
            formatRawLogToLogEvent(
                {
                    message: 'original',
                    context: { loggedIn: true },
                    status: 'info'
                },
                {
                    userInfo: {
                        name: 'userName',
                        extraInfo: { loggedIn: true }
                    },
                    attributes: { appType: 'student' }
                }
            )
        ).toEqual({
            message: 'original',
            context: { loggedIn: true },
            status: 'info',
            userInfo: {
                name: 'userName',
                extraInfo: { loggedIn: true }
            },
            attributes: { appType: 'student' }
        });
    });

    it('formats a raw log with error attributes and with context, userInfo and attributes to a LogEvent', () => {
        expect(
            formatRawLogToLogEvent(
                {
                    message: 'original',
                    errorKind: 'TypeError',
                    errorMessage: 'something went wrong',
                    stacktrace: 'stacktrace',
                    context: { loggedIn: true },
                    status: 'info'
                },
                {
                    userInfo: {
                        name: 'userName',
                        extraInfo: { loggedIn: true }
                    },
                    attributes: { appType: 'student' }
                }
            )
        ).toEqual({
            message: 'original',
            errorKind: 'TypeError',
            errorMessage: 'something went wrong',
            stacktrace: 'stacktrace',
            context: { loggedIn: true },
            status: 'info',
            userInfo: {
                name: 'userName',
                extraInfo: { loggedIn: true }
            },
            attributes: { appType: 'student' }
        });
    });

    it('formats a raw log with error attributes and with context, userInfo, attributes and source to a LogEvent', () => {
        expect(
            formatRawLogToLogEvent(
                {
                    message: 'original',
                    errorKind: 'TypeError',
                    errorMessage: 'something went wrong',
                    stacktrace: 'stacktrace',
                    context: { loggedIn: true },
                    status: 'info',
                    source: ErrorSource.CONSOLE
                },
                {
                    userInfo: {
                        name: 'userName',
                        extraInfo: { loggedIn: true }
                    },
                    attributes: { appType: 'student' }
                }
            )
        ).toEqual({
            message: 'original',
            errorKind: 'TypeError',
            errorMessage: 'something went wrong',
            stacktrace: 'stacktrace',
            context: { loggedIn: true },
            status: 'info',
            source: ErrorSource.CONSOLE,
            userInfo: {
                name: 'userName',
                extraInfo: { loggedIn: true }
            },
            attributes: { appType: 'student' }
        });
    });
});
