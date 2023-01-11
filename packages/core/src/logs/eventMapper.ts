/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import { DdSdk } from '../foundation';
import type { UserInfo } from '../sdk/UserInfoSingleton/types';

import type { LogEvent, LogEventMapper, LogStatus, RawLog } from './types';
import { deepClone } from './utils/deepClone';

export const applyLogEventMapper = (
    logEventMapper: LogEventMapper,
    log: LogEvent
): LogEvent => {
    const originalLog = deepClone(log);

    try {
        const mappedEvent = logEventMapper(log);

        return {
            message: mappedEvent.message,
            context: mappedEvent.context,
            status: originalLog.status,
            userInfo: originalLog.userInfo,
            attributes: originalLog.attributes
        };
    } catch (error) {
        InternalLog.log(
            `The log event mapper crashed when mapping log ${JSON.stringify(
                originalLog
            )}: ${error}`,
            SdkVerbosity.WARN
        );
        DdSdk.telemetryDebug('Error while running the log event mapper');
        return originalLog;
    }
};

export const formatLogEvent = (
    rawLog: RawLog,
    additionalInformation: { logStatus: LogStatus; userInfo: UserInfo }
): LogEvent => {
    return {
        ...rawLog,
        status: additionalInformation.logStatus,
        userInfo: additionalInformation.userInfo
    };
};
