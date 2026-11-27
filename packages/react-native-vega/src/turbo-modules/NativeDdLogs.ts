/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Kepler codegen requires Object for arbitrary bridge dictionaries.
/* eslint-disable @typescript-eslint/ban-types */
import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

export interface DdLogs extends KeplerTurboModule {
    log(
        level: string,
        message: string,
        errorKind: string,
        errorMessage: string,
        stacktrace: string,
        context: Object
    ): Promise<void>;
}

export const getNativeDdLogs = (): DdLogs | null =>
    TurboModuleRegistry.get<DdLogs>('DdLogs') ?? null;
