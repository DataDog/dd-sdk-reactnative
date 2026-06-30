/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    DdNativeFlagsType,
    DdNativeSdkType,
    DdNativeLogsType
} from '../src/nativeModulesTypes';
import type { DdRumType } from '../src/rum/types';
import type { DdTraceType } from '../src/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const actualRN = require('react-native');

const mockFlagsDebugState = {
    status: 'ready',
    activeConfigurationKind: 'rules',
    activeEtag: 'ffe-system-test-data',
    configurationSetCount: 1,
    fetchCount: 1,
    evaluationCount: 0,
    lastEvent: 'provider_ready',
    lastFetchRequest: {
        url: 'https://mock.datadog.test/config',
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        statusCode: 200
    },
    evaluationSideEffects: {
        attemptedCount: 0,
        trackedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        lastStatus: 'skipped'
    }
};

const mockConfigurationFromString = (wire: string) => {
    const parsed = JSON.parse(wire);
    const kind =
        parsed.server && parsed.precomputed
            ? 'mixed'
            : parsed.server
            ? 'rules'
            : 'precomputed';

    return {
        __ddNativeFfeConfiguration: true,
        version: parsed.version,
        kind,
        etag: parsed.server?.etag ?? parsed.precomputed?.etag,
        wire
    };
};

const mockFetchConfiguration = (
    kind: 'precomputed' | 'rules',
    options: { previousConfigurationWire?: string }
) => {
    return mockConfigurationFromString(
        options.previousConfigurationWire ??
            JSON.stringify({
                version: 2,
                [kind === 'rules' ? 'server' : 'precomputed']: {
                    response: '{}',
                    etag: 'mock-fetch'
                }
            })
    );
};

actualRN.NativeModules.DdSdk = {
    initialize: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['initialize']>,
    setUserInfo: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['setUserInfo']>,
    addUserExtraInfo: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['addUserExtraInfo']>,
    clearUserInfo: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['clearUserInfo']>,
    addAttribute: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['addAttribute']>,
    removeAttribute: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['removeAttribute']>,
    addAttributes: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['addAttributes']>,
    removeAttributes: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['removeAttributes']>,
    setTrackingConsent: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['setTrackingConsent']>,
    sendTelemetryLog: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['sendTelemetryLog']>,
    telemetryDebug: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['telemetryDebug']>,
    telemetryError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['telemetryError']>,
    consumeWebviewEvent: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['consumeWebviewEvent']>,
    clearAllData: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeSdkType['clearAllData']>,
    configurationFromString: jest.fn().mockImplementation(
        (wire: string) =>
            new Promise<object>(resolve =>
                resolve(mockConfigurationFromString(wire))
            )
    ) as jest.MockedFunction<DdNativeSdkType['configurationFromString']>,
    configurationToString: jest.fn().mockImplementation(
        (configuration: { wire?: string }) =>
            new Promise<string>(resolve => resolve(configuration.wire ?? '{}'))
    ) as jest.MockedFunction<DdNativeSdkType['configurationToString']>,
    fetchRulesConfiguration: jest.fn().mockImplementation(
        (options: { previousConfigurationWire?: string }) =>
            new Promise<object>(resolve =>
                resolve(mockFetchConfiguration('rules', options))
            )
    ) as jest.MockedFunction<DdNativeSdkType['fetchRulesConfiguration']>,
    fetchPrecomputedConfiguration: jest.fn().mockImplementation(
        (options: { previousConfigurationWire?: string }) =>
            new Promise<object>(resolve =>
                resolve(mockFetchConfiguration('precomputed', options))
            )
    ) as jest.MockedFunction<DdNativeSdkType['fetchPrecomputedConfiguration']>,
    setConfiguration: jest.fn().mockImplementation(
        () => new Promise<object>(resolve => resolve(mockFlagsDebugState))
    ) as jest.MockedFunction<DdNativeSdkType['setConfiguration']>,
    setEvaluationContext: jest.fn().mockImplementation(
        (context: object) =>
            new Promise<object>(resolve =>
                resolve({
                    ...mockFlagsDebugState,
                    currentContext: context
                })
            )
    ) as jest.MockedFunction<DdNativeSdkType['setEvaluationContext']>,
    resolveBooleanEvaluation: jest.fn().mockImplementation(
        (flagKey: string, defaultValue: boolean) =>
            new Promise<object>(resolve =>
                resolve({
                    flagKey,
                    value: defaultValue,
                    reason: 'DEFAULT'
                })
            )
    ) as jest.MockedFunction<DdNativeSdkType['resolveBooleanEvaluation']>,
    resolveStringEvaluation: jest.fn().mockImplementation(
        (flagKey: string, defaultValue: string) =>
            new Promise<object>(resolve =>
                resolve({
                    flagKey,
                    value: defaultValue,
                    reason: 'DEFAULT'
                })
            )
    ) as jest.MockedFunction<DdNativeSdkType['resolveStringEvaluation']>,
    resolveNumberEvaluation: jest.fn().mockImplementation(
        (flagKey: string, defaultValue: number) =>
            new Promise<object>(resolve =>
                resolve({
                    flagKey,
                    value: defaultValue,
                    reason: 'DEFAULT'
                })
            )
    ) as jest.MockedFunction<DdNativeSdkType['resolveNumberEvaluation']>,
    resolveObjectEvaluation: jest.fn().mockImplementation(
        (flagKey: string, defaultValue: object) =>
            new Promise<object>(resolve =>
                resolve({
                    flagKey,
                    value: defaultValue,
                    reason: 'DEFAULT'
                })
            )
    ) as jest.MockedFunction<DdNativeSdkType['resolveObjectEvaluation']>,
    getProviderDebugState: jest.fn().mockImplementation(
        () => new Promise<object>(resolve => resolve(mockFlagsDebugState))
    ) as jest.MockedFunction<DdNativeSdkType['getProviderDebugState']>,
    addListener: jest.fn().mockImplementation((_: string) => {
        /* empty */
    }) as jest.MockedFunction<DdNativeSdkType['addListener']>,
    removeListeners: jest.fn().mockImplementation((_: number) => {
        /* empty */
    }) as jest.MockedFunction<DdNativeSdkType['removeListeners']>,
    onRUMSessionStarted: jest.fn().mockImplementation((_: string) => {
        /* empty */
    }) as jest.MockedFunction<DdNativeSdkType['onRUMSessionStarted']>
};

actualRN.NativeModules.DdLogs = {
    debug: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['debug']>,
    info: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['info']>,
    warn: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['warn']>,
    error: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['error']>,
    debugWithError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['debugWithError']>,
    infoWithError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['infoWithError']>,
    warnWithError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['warnWithError']>,
    errorWithError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdNativeLogsType['errorWithError']>
};

actualRN.NativeModules.DdTrace = {
    startSpan: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdTraceType['startSpan']>,
    finishSpan: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdTraceType['finishSpan']>
};

actualRN.NativeModules.DdRum = {
    startView: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startView']>,
    stopView: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopView']>,
    startAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startAction']>,
    stopAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopAction']>,
    addAction: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addAction']>,
    startResource: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startResource']>,
    stopResource: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopResource']>,
    addError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addError']>,
    addTiming: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addTiming']>,
    addViewAttribute: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addViewAttribute']>,
    removeViewAttribute: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['removeViewAttribute']>,
    addViewAttributes: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addViewAttributes']>,
    removeViewAttributes: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['removeViewAttributes']>,
    addViewLoadingTime: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['addViewLoadingTime']>,
    stopSession: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['stopSession']>,
    getCurrentSessionId: jest.fn().mockImplementation(
        () =>
            new Promise<string | undefined>(resolve =>
                resolve('test-session-id')
            )
    ) as jest.MockedFunction<DdRumType['getCurrentSessionId']>,
    startFeatureOperation: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startFeatureOperation']>,
    succeedFeatureOperation: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['startFeatureOperation']>,
    failFeatureOperation: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<DdRumType['failFeatureOperation']>
};

const DdFlags: DdNativeFlagsType = {
    enable: jest.fn(() => Promise.resolve()),
    setEvaluationContext: jest.fn(() => Promise.resolve({})),
    trackEvaluation: jest.fn(() => Promise.resolve())
};
actualRN.NativeModules.DdFlags = DdFlags;

module.exports = actualRN;
