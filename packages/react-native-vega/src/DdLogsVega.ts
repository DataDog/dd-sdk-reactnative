/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorSource } from '@datadog/mobile-react-native';
import { DdAttributes, debugId } from '@datadog/mobile-react-native/internal';

import NativeDdLogs from './turbo-modules/NativeDdLogs';

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

const isLogWithError = (
    args: LogArguments | LogWithErrorArguments
): args is LogWithErrorArguments =>
    typeof args[1] === 'string' ||
    typeof args[2] === 'string' ||
    typeof args[3] === 'string' ||
    (args[4] !== undefined && args[4] !== null) ||
    typeof args[5] === 'string';

class DdLogsVega {
    debug = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('debug', args);

    info = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('info', args);

    warn = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('warn', args);

    error = (...args: LogArguments | LogWithErrorArguments): Promise<void> =>
        this.send('error', args);

    private send = (
        level: LogLevel,
        args: LogArguments | LogWithErrorArguments
    ): Promise<void> => {
        if (!isLogWithError(args)) {
            return NativeDdLogs[level](args[0], args[1] ?? {});
        }

        const context: Record<string, unknown> = {
            ...(args[4] ?? {}),
            [DdAttributes.errorSourceType]: 'react-native'
        };
        if (args[5]) {
            context[DdAttributes.errorFingerprint] = args[5];
        }
        if (debugId) {
            context[DdAttributes.debugId] = debugId;
        }

        return NativeDdLogs[`${level}WithError`](
            args[0],
            args[1] ?? '',
            args[2] ?? '',
            args[3] ?? '',
            context
        );
    };
}

export const DdLogs = new DdLogsVega();
