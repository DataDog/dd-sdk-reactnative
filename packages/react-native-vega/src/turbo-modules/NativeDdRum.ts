/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { KeplerTurboModule } from '@amazon-devices/keplerscript-turbomodule-api';
import { TurboModuleRegistry } from '@amazon-devices/keplerscript-turbomodule-api';

/* eslint-disable @typescript-eslint/ban-types */
export interface DdRum extends KeplerTurboModule {
    // Compatibility no-ops for APIs unavailable in the C++ SDK.
    addTiming(name: string): Promise<void>;
    addViewLoadingTime(overwrite: boolean): Promise<void>;
    addFeatureFlagEvaluation(name: string, value: Object): Promise<void>;
    getCurrentSessionId(): Promise<string>;
    startView(
        key: string,
        name: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    stopView(key: string, context: Object, timestampMs: number): Promise<void>;
    startAction(
        type: string,
        name: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    stopAction(
        type: string,
        name: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    addAction(
        type: string,
        name: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    startResource(
        key: string,
        method: string,
        url: string,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    stopResource(
        key: string,
        statusCode: number,
        kind: string,
        size: number,
        context: Object,
        timestampMs: number
    ): Promise<void>;
    addError(
        message: string,
        source: string,
        stacktrace: string,
        context: Object,
        timestampMs: number,
        fingerprint: string
    ): Promise<void>;
    addViewAttribute(key: string, value: Object): Promise<void>;
    removeViewAttribute(key: string): Promise<void>;
    addViewAttributes(attributes: Object): Promise<void>;
    removeViewAttributes(keys: string[]): Promise<void>;
    reportAppFullyDisplayed(): Promise<void>;
    stopSession(): Promise<void>;
    startFeatureOperation(
        name: string,
        operationKey: string,
        attributes: Object
    ): Promise<void>;
    succeedFeatureOperation(
        name: string,
        operationKey: string,
        attributes: Object
    ): Promise<void>;
    failFeatureOperation(
        name: string,
        operationKey: string,
        reason: string,
        attributes: Object
    ): Promise<void>;
}

export const getNativeDdRum = (): DdRum | null =>
    TurboModuleRegistry.get<DdRum>('DdRum') ?? null;
