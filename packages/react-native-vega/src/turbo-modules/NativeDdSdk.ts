/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

export interface DdSdk extends KeplerTurboModule {
    startHttpProxy(): Promise<void>;
    httpResponse(requestId: string, statusCode: number): Promise<void>;
}

export const getNativeDdSdk = (): DdSdk | null =>
    TurboModuleRegistry.get<DdSdk>('DdSdk') ?? null;
