/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorSource } from '@datadog/mobile-react-native';

import { callNative } from './callNative';
import { getNativeDdLogs } from './turbo-modules/NativeDdLogs';

type LogArguments = [message: string, context?: object];
type LogWithErrorArguments = [
    message: string,
    errorKind?: string,
    errorMessage?: string,
    stacktrace?: string,
    context?: object,
    fingerprint?: string,
    source?: ErrorSource
];
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class DdLogsVega {
    debug = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('debug', args);
    info = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('info', args);
    warn = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('warn', args);
    error = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('error', args);

    private send = async (
        level: LogLevel,
        args: LogArguments | LogWithErrorArguments
    ): Promise<void> => {
        await callNative(getNativeDdLogs, native => {
            const hasError =
                typeof args[1] === 'string' ||
                typeof args[2] === 'string' ||
                typeof args[3] === 'string' ||
                args[4] != null ||
                typeof args[5] === 'string' ||
                typeof args[6] === 'string';
            if (!hasError) {
                return native.log(
                    level,
                    args[0],
                    '',
                    '',
                    '',
                    (args[1] as object) ?? {}
                );
            }
            const errorArgs = args as LogWithErrorArguments;
            const context = { ...errorArgs[4] };
            if (errorArgs[5]) {
                Object.assign(context, {
                    '_dd.error.fingerprint': errorArgs[5]
                });
            }
            return native.log(
                level,
                args[0],
                errorArgs[1] ?? '',
                errorArgs[2] ?? '',
                errorArgs[3] ?? '',
                context
            );
        });
    };
}

export const DdLogs = new DdLogsVega();
