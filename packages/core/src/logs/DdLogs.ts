import { NativeModules } from 'react-native';

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeLogsType } from '../nativeModulesTypes';
import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';

import { applyLogEventMapper, formatLogEvent } from './eventMapper';
import type { DdLogsType, LogEvent, LogEventMapper, LogStatus } from './types';

const generateEmptyPromise = () => new Promise<void>(resolve => resolve());

class DdLogsWrapper implements DdLogsType {
    private nativeLogs: DdNativeLogsType = NativeModules.DdLogs;
    private logEventMapper: LogEventMapper | null = null;

    debug(message: string, context: object = {}): Promise<void> {
        return this.log(message, context, 'debug');
    }

    info(message: string, context: object = {}): Promise<void> {
        return this.log(message, context, 'info');
    }

    warn(message: string, context: object = {}): Promise<void> {
        return this.log(message, context, 'warn');
    }

    error(message: string, context: object = {}): Promise<void> {
        return this.log(message, context, 'error');
    }

    private log = (
        message: string,
        context: object,
        status: keyof DdNativeLogsType
    ): Promise<void> => {
        InternalLog.log(
            `Tracking ${status} log “${message}”`,
            SdkVerbosity.DEBUG
        );
        const event = this.applyLogEventMapper(message, context, status);
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs[status](event.message, event.context);
    };

    registerLogEventMapper(logEventMapper: LogEventMapper) {
        this.logEventMapper = logEventMapper;
    }

    unregisterLogEventMapper() {
        this.logEventMapper = null;
    }

    private applyLogEventMapper = (
        message: string,
        context: object,
        logStatus: LogStatus
    ): LogEvent | null => {
        const userInfo = UserInfoSingleton.getInstance().getUserInfo();
        const initialLogEvent = formatLogEvent(
            { message, context },
            { logStatus, userInfo }
        );

        if (!this.logEventMapper) {
            return initialLogEvent;
        }

        return applyLogEventMapper(this.logEventMapper, initialLogEvent);
    };
}

export const DdLogs = new DdLogsWrapper();
