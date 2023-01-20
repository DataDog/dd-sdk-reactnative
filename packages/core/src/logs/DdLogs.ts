/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';
import type { DdNativeLogsType } from '../nativeModulesTypes';

import { generateEventMapper } from './eventMapper';
import type { DdLogsType, LogEventMapper } from './types';

const generateEmptyPromise = () => new Promise<void>(resolve => resolve());

class DdLogsWrapper implements DdLogsType {
    private nativeLogs: DdNativeLogsType = NativeModules.DdLogs;
    private logEventMapper = generateEventMapper(undefined);

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
        const event = this.logEventMapper.applyEventMapper({
            message,
            context,
            status
        });
        if (!event) {
            return generateEmptyPromise();
        }
        return this.nativeLogs[status](event.message, event.context);
    };

    registerLogEventMapper(logEventMapper: LogEventMapper) {
        this.logEventMapper = generateEventMapper(logEventMapper);
    }

    unregisterLogEventMapper() {
        this.logEventMapper = generateEventMapper(undefined);
    }
}

export const DdLogs = new DdLogsWrapper();
