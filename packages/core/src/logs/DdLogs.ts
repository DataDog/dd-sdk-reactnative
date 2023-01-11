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
        InternalLog.log(`Tracking debug log “${message}”`, SdkVerbosity.DEBUG);
        const event = this.applyLogEventMapper(message, context, 'debug');
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs.debug(event.message, event.context);
    }

    info(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking info log “${message}”`, SdkVerbosity.DEBUG);
        const event = this.applyLogEventMapper(message, context, 'info');
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs.info(event.message, event.context);
    }

    warn(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking warn log “${message}”`, SdkVerbosity.DEBUG);
        const event = this.applyLogEventMapper(message, context, 'warn');
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs.warn(event.message, event.context);
    }

    error(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking error log “${message}”`, SdkVerbosity.DEBUG);
        const event = this.applyLogEventMapper(message, context, 'error');
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs.error(event.message, event.context);
    }

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
