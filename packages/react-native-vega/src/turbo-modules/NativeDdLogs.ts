/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

export interface DdLogs extends KeplerTurboModule {
    debug(message: string, context: Object): Promise<void>;
    info(message: string, context: Object): Promise<void>;
    warn(message: string, context: Object): Promise<void>;
    error(message: string, context: Object): Promise<void>;
    debugWithError(
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ): Promise<void>;
    infoWithError(
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ): Promise<void>;
    warnWithError(
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ): Promise<void>;
    errorWithError(
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ): Promise<void>;
}

const module = TurboModuleRegistry.get<DdLogs>('DdLogs');
if (!module) {
    console.warn(
        '[Datadog] DdLogs native module not found. Verify libDatadogVega.so is loaded.'
    );
}
export default module!;
