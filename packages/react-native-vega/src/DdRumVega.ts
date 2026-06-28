/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorSource, FeatureOperationFailure } from '@datadog/mobile-react-native';

import NativeDdRum from './turbo-modules/NativeDdRum';

/**
 * Vega-specific DdRum wrapper that uses Kepler TurboModules.
 *
 * For the POC, this is a simplified version of core's DdRumWrapper:
 * - No event mappers (calls forwarded directly to native)
 * - No attribute encoding
 * - No buffering (calls go straight to native module)
 *
 * These features can be added incrementally.
 */
class DdRumVega {
    startView = async (
        key: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        await NativeDdRum.startView(key, name, context, timestampMs);
    };

    stopView = (
        key: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.stopView(key, context, timestampMs);
    };

    startAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.startAction(type, name, context, timestampMs);
    };

    stopAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.stopAction(type, name, context, timestampMs);
    };

    addAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.addAction(type, name, context, timestampMs);
    };

    startResource = (
        key: string,
        method: string,
        url: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.startResource(
            key,
            method,
            url,
            context,
            timestampMs
        );
    };

    stopResource = (
        key: string,
        statusCode: number,
        kind: string,
        size: number = -1,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return NativeDdRum.stopResource(
            key,
            statusCode,
            kind,
            size,
            context,
            timestampMs
        );
    };

    addError = (
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context: object = {},
        timestampMs: number = Date.now(),
        fingerprint: string = ''
    ): Promise<void> => {
        return NativeDdRum.addError(
            message,
            source,
            stacktrace,
            context,
            timestampMs,
            fingerprint
        );
    };

    addTiming = (name: string): Promise<void> => {
        return NativeDdRum.addTiming(name);
    };

    addViewAttribute = (key: string, value: unknown): Promise<void> => {
        return NativeDdRum.addViewAttribute(key, { value });
    };

    removeViewAttribute = (key: string): Promise<void> => {
        return NativeDdRum.removeViewAttribute(key);
    };

    addViewAttributes = (attributes: object): Promise<void> => {
        return NativeDdRum.addViewAttributes(attributes);
    };

    removeViewAttributes = (keys: string[]): Promise<void> => {
        return NativeDdRum.removeViewAttributes(keys);
    };

    addViewLoadingTime = (overwrite: boolean): Promise<void> => {
        return NativeDdRum.addViewLoadingTime(overwrite);
    };

    stopSession = (): Promise<void> => {
        return NativeDdRum.stopSession();
    };

    addFeatureFlagEvaluation = (
        name: string,
        value: unknown
    ): Promise<void> => {
        return NativeDdRum.addFeatureFlagEvaluation(name, { value });
    };

    getCurrentSessionId = async (): Promise<string | undefined> => {
        const sessionId = await NativeDdRum.getCurrentSessionId();
        return sessionId || undefined;
    };

    startFeatureOperation = (
        name: string,
        operationKey: string | null,
        attributes: object = {}
    ): Promise<void> => {
        return NativeDdRum.startFeatureOperation(
            name,
            operationKey ?? '',
            attributes
        );
    };

    succeedFeatureOperation = (
        name: string,
        operationKey: string | null,
        attributes: object = {}
    ): Promise<void> => {
        return NativeDdRum.succeedFeatureOperation(
            name,
            operationKey ?? '',
            attributes
        );
    };

    failFeatureOperation = (
        name: string,
        operationKey: string | null,
        reason: FeatureOperationFailure,
        attributes: object = {}
    ): Promise<void> => {
        return NativeDdRum.failFeatureOperation(
            name,
            operationKey ?? '',
            reason,
            attributes
        );
    };
}

export const DdRum = new DdRumVega();
