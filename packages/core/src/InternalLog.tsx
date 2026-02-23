/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { SdkVerbosity } from './config/types/SdkVerbosity';
import { getGlobalInstance } from './utils/singletonUtils';

export const DATADOG_MESSAGE_PREFIX = 'DATADOG:';

const INTERNAL_LOG_MODULE = 'com.datadog.reactnative.internal_log';

/**
 * /!\ DO NOT USE THIS IN YOUR APP /!\\
 *
 * This logger is only for debugging the Datadog SDK.
 */
class _InternalLog {
    private levelMap = new Map<SdkVerbosity, number>([
        [SdkVerbosity.DEBUG, 1],
        [SdkVerbosity.INFO, 2],
        [SdkVerbosity.WARN, 3],
        [SdkVerbosity.ERROR, 4]
    ]);

    public verbosity: SdkVerbosity | undefined = undefined;

    public log(message: string, verbosity: SdkVerbosity): void {
        if (this.verbosity === undefined) {
            return;
        }
        const requiredLevel = InternalLog.levelMap.get(verbosity);
        const allowedLevel = InternalLog.levelMap.get(this.verbosity);
        if (allowedLevel === undefined || requiredLevel === undefined) {
            return;
        }
        const prefixedMessage = `${DATADOG_MESSAGE_PREFIX} ${message}`;
        if (verbosity === SdkVerbosity.ERROR && requiredLevel >= allowedLevel) {
            console.error(prefixedMessage);
        }

        if (verbosity === SdkVerbosity.WARN && requiredLevel >= allowedLevel) {
            console.warn(prefixedMessage);
        }

        if (verbosity === SdkVerbosity.INFO && requiredLevel >= allowedLevel) {
            console.info(prefixedMessage);
        }

        if (verbosity === SdkVerbosity.DEBUG && requiredLevel >= allowedLevel) {
            console.debug(prefixedMessage);
        }
    }
}

export const InternalLog = getGlobalInstance(
    INTERNAL_LOG_MODULE,
    () => new _InternalLog()
);
