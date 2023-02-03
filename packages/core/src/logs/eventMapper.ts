/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Attributes } from '../sdk/AttributesSingleton/types';
import { EventMapper } from '../sdk/EventMappers/EventMapper';
import type { UserInfo } from '../sdk/UserInfoSingleton/types';

import type { LogEvent, LogEventMapper, NativeLog, RawLog } from './types';

export const formatLogEventToNativeLog = (logEvent: LogEvent): NativeLog => {
    return logEvent;
};

export const formatRawLogToNativeEvent = (rawLog: RawLog): NativeLog => {
    return rawLog;
};

export const formatRawLogToLogEvent = (
    rawLog: RawLog,
    additionalInformation: {
        userInfo: UserInfo;
        attributes: Attributes;
    }
): LogEvent => {
    return {
        ...rawLog,
        userInfo: additionalInformation.userInfo,
        attributes: additionalInformation.attributes
    };
};

export const generateEventMapper = (
    logEventMapper: LogEventMapper | undefined
) =>
    new EventMapper(
        logEventMapper,
        formatRawLogToLogEvent,
        formatLogEventToNativeLog,
        formatRawLogToNativeEvent
    );
