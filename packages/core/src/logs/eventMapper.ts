import type { LogEvent, LogEventMapper, LogStatus, RawLog } from './types';

export const applyLogEventMapper = (
    logEventMapper: LogEventMapper,
    log: LogEvent
): LogEvent => {
    const originalLog = { ...log };
    const mappedEvent = logEventMapper(log);

    return {
        message: mappedEvent.message,
        context: mappedEvent.context,
        status: originalLog.status,
        userInfo: originalLog.userInfo,
        attributes: originalLog.attributes
    };
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
