/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    ErrorSource,
    FeatureOperationFailure
} from '@datadog/mobile-react-native';

import { callNative } from './callNative';
import { getNativeDdRum } from './turbo-modules/NativeDdRum';
import type { DdRum as NativeDdRum } from './turbo-modules/NativeDdRum';

const callRum = (call: (native: NativeDdRum) => Promise<void>): Promise<void> =>
    callNative(getNativeDdRum, call).then(() => undefined);

/** Manual RUM APIs for Vega. Unsupported C++ SDK APIs are documented in README.md. */
class DdRumVega {
    startView = async (
        key: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        await callRum(native =>
            native.startView(key, name, context, timestampMs)
        );
    };

    stopView = (
        key: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return callRum(native => native.stopView(key, context, timestampMs));
    };

    startAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return callRum(native =>
            native.startAction(type, name, context, timestampMs)
        );
    };

    stopAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return callRum(native =>
            native.stopAction(type, name, context, timestampMs)
        );
    };

    addAction = (
        type: string,
        name: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return callRum(native =>
            native.addAction(type, name, context, timestampMs)
        );
    };

    startResource = (
        key: string,
        method: string,
        url: string,
        context: object = {},
        timestampMs: number = Date.now()
    ): Promise<void> => {
        return callRum(native =>
            native.startResource(key, method, url, context, timestampMs)
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
        return callRum(native =>
            native.stopResource(
                key,
                statusCode,
                kind,
                size,
                context,
                timestampMs
            )
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
        return callRum(native =>
            native.addError(
                message,
                source,
                stacktrace,
                context,
                timestampMs,
                fingerprint
            )
        );
    };

    addTiming = (_name: string): Promise<void> => {
        return Promise.resolve();
    };

    addViewAttribute = (key: string, value: unknown): Promise<void> => {
        return callRum(native => native.addViewAttribute(key, { value }));
    };

    removeViewAttribute = (key: string): Promise<void> => {
        return callRum(native => native.removeViewAttribute(key));
    };

    addViewAttributes = (attributes: object): Promise<void> => {
        return callRum(native => native.addViewAttributes(attributes));
    };

    removeViewAttributes = (keys: string[]): Promise<void> => {
        return callRum(native => native.removeViewAttributes(keys));
    };

    addViewLoadingTime = (_overwrite: boolean): Promise<void> => {
        return Promise.resolve();
    };

    reportAppFullyDisplayed = (): Promise<void> => {
        return callRum(native => native.reportAppFullyDisplayed());
    };

    stopSession = (): Promise<void> => {
        return callRum(native => native.stopSession());
    };

    addFeatureFlagEvaluation = (
        _name: string,
        _value: unknown
    ): Promise<void> => {
        return Promise.resolve();
    };

    getCurrentSessionId = async (): Promise<string | undefined> => {
        return undefined;
    };

    startFeatureOperation = (
        name: string,
        operationKey: string | null,
        attributes: object = {}
    ): Promise<void> => {
        return callRum(native =>
            native.startFeatureOperation(name, operationKey ?? '', attributes)
        );
    };

    succeedFeatureOperation = (
        name: string,
        operationKey: string | null,
        attributes: object = {}
    ): Promise<void> => {
        return callRum(native =>
            native.succeedFeatureOperation(name, operationKey ?? '', attributes)
        );
    };

    failFeatureOperation = (
        name: string,
        operationKey: string | null,
        reason: FeatureOperationFailure,
        attributes: object = {}
    ): Promise<void> => {
        return callRum(native =>
            native.failFeatureOperation(
                name,
                operationKey ?? '',
                reason,
                attributes
            )
        );
    };
}

export const DdRum = new DdRumVega();
