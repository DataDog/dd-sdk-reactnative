/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import { DdSdk } from '../foundation';
import type { Attributes } from '../sdk/AttributesSingleton/types';
import type { UserInfo } from '../sdk/UserInfoSingleton/types';

import type {
    LogEvent,
    LogEventMapper,
    LogStatus,
    NativeLog,
    RawLog
} from './types';
import { deepClone } from './utils/deepClone';

export const applyLogEventMapper = (
    logEventMapper: LogEventMapper,
    log: LogEvent
): NativeLog | null => {
    const originalLog = deepClone(log);

    try {
        const mappedEvent = logEventMapper(log);

        if (!mappedEvent) {
            return null;
        }

        return {
            message: mappedEvent.message,
            context: mappedEvent.context
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
    additionalInformation: {
        logStatus: LogStatus;
        userInfo: UserInfo;
        attributes: Attributes;
    }
): LogEvent => {
    return {
        ...rawLog,
        status: additionalInformation.logStatus,
        userInfo: additionalInformation.userInfo,
        attributes: additionalInformation.attributes
    };
};
