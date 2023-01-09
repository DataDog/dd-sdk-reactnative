import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import { DdSdk } from '../foundation';

import type { LogEvent, LogEventMapper, LogStatus, RawLog } from './types';

export const applyLogEventMapper = (
    logEventMapper: LogEventMapper,
    log: LogEvent
): LogEvent => {
    // TODO when adding user attributes: Make a deep copy of the event to prevent
    // nested properties to be overwrittern
    const originalLog = { ...log };

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
    logStatus: LogStatus
): LogEvent => {
    return {
        ...rawLog,
        status: logStatus
    };
};
