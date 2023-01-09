import { NativeModules } from 'react-native';

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeLogsType } from '../nativeModulesTypes';

import type { DdLogsType } from './types';

class DdLogsWrapper implements DdLogsType {
    private nativeLogs: DdNativeLogsType = NativeModules.DdLogs;

    debug(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking debug log “${message}”`, SdkVerbosity.DEBUG);
        return this.nativeLogs.debug(message, context);
    }

    info(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking info log “${message}”`, SdkVerbosity.DEBUG);
        return this.nativeLogs.info(message, context);
    }

    warn(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking warn log “${message}”`, SdkVerbosity.DEBUG);
        return this.nativeLogs.warn(message, context);
    }

    error(message: string, context: object = {}): Promise<void> {
        InternalLog.log(`Tracking error log “${message}”`, SdkVerbosity.DEBUG);
        return this.nativeLogs.error(message, context);
    }
}

export const DdLogs: DdLogsType = new DdLogsWrapper();
