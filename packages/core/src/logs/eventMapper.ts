import type { LogEvent, LogStatus, RawLog } from './types';

export const formatLogEvent = (
    rawLog: RawLog,
    logStatus: LogStatus
): LogEvent => {
    return {
        ...rawLog,
        status: logStatus
    };
};
