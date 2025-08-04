/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AdditionalEventDataForMapper } from '@datadog/mobile-react-native';
import { EventMapper } from '@datadog/mobile-react-native';

import type {
    LogEvent,
    LogEventMapper,
    NativeLog,
    NativeLogWithError,
    RawLog,
    RawLogWithError
} from './types';

export const formatLogEventToNativeLog = (
    logEvent: LogEvent
): NativeLog | NativeLogWithError => {
    return logEvent;
};

export const formatRawLogToNativeEvent = (
    rawLog: RawLog | RawLogWithError
): NativeLog | NativeLogWithError => {
    return rawLog;
};

export const formatRawLogToLogEvent = (
    rawLog: RawLog | RawLogWithError,
    additionalInformation: AdditionalEventDataForMapper
): LogEvent => {
    const userInfo = {
        ...additionalInformation.userInfo,
        id: additionalInformation.userInfo.id ?? ''
    };

    return {
        ...rawLog,
        userInfo,
        attributes: additionalInformation.attributes
    };
};

export const generateEventMapper = (
    logEventMapper: LogEventMapper | undefined
) => {
    console.log('generateEventMapper', EventMapper);
    return new EventMapper(
        logEventMapper,
        formatRawLogToLogEvent,
        formatLogEventToNativeLog,
        formatRawLogToNativeEvent
    );
};
