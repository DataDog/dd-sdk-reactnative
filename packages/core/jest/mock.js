/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable react/jsx-filename-extension */
/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react');

const actualDatadog = jest.requireActual('@datadog/mobile-react-native');

const mockFlagsDebugState = {
    status: 'ready',
    activeConfigurationKind: 'rules',
    activeEtag: 'ffe-system-test-data',
    configurationSetCount: 1,
    fetchCount: 0,
    evaluationCount: 0,
    lastEvent: 'provider_ready',
    evaluationSideEffects: {
        attemptedCount: 0,
        trackedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        lastStatus: 'skipped'
    }
};

const mockConfigurationFromString = wire => {
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

/**
 * Explicitly mocking the provider prevents auto-instrumentation in tests.
 * This prevents errors in tests to be logged in the console, as well as needing
 * to mock XMLHttpRequest.
 */
const DatadogProviderMock = ({ children }) => {
    return <>{children}</>;
};
DatadogProviderMock.initialize = jest.fn().mockResolvedValue();

module.exports = {
    ...actualDatadog,
    DdSdkReactNative: {
        initialize: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        isInitialized: jest.fn().mockImplementation(() => true),
        setUserInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addUserExtraInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        clearUserInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        setAccountInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addAccountExtraInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        clearAccountInfo: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addAttribute: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        removeAttribute: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addAttributes: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        removeAttributes: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        setTrackingConsent: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        sendTelemetryLog: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        telemetryDebug: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        telemetryError: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        clearAllData: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        configurationFromString: jest
            .fn()
            .mockImplementation(
                wire =>
                    new Promise(resolve =>
                        resolve(mockConfigurationFromString(wire))
                    )
            ),
        configurationToString: jest
            .fn()
            .mockImplementation(
                configuration =>
                    new Promise(resolve => resolve(configuration.wire ?? '{}'))
            ),
        setConfiguration: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve(mockFlagsDebugState))
            ),
        setEvaluationContext: jest
            .fn()
            .mockImplementation(
                context =>
                    new Promise(resolve =>
                        resolve({
                            ...mockFlagsDebugState,
                            currentContext: context
                        })
                    )
            ),
        resolveBooleanEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveStringEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveNumberEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveObjectEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        getProviderDebugState: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve(mockFlagsDebugState))
            )
    },

    DdLogs: {
        debug: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        info: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        warn: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        error: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve()))
    },

    DdTrace: {
        startSpan: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve('fakeSpanId'))
            ),
        finishSpan: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve()))
    },

    DdRum: {
        startView: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        stopView: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        startAction: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        stopAction: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addAction: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        startResource: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        stopResource: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addError: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addTiming: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addViewAttribute: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        removeViewAttribute: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addViewAttributes: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        removeViewAttributes: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addViewLoadingTime: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        addFeatureFlagEvaluation: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        stopSession: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        getCurrentSessionId: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve('test-session-id'))
            ),
        startFeatureOperation: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        succeedFeatureOperation: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        failFeatureOperation: jest
            .fn()
            .mockImplementation(() => new Promise() < (resolve => resolve())),
        setTimeProvider: jest.fn().mockImplementation(() => {}),
        timeProvider: jest.fn().mockReturnValue(undefined),
        getTracingContext: jest.fn().mockReturnValue(undefined),
        getTracingContextForPropagators: jest.fn().mockReturnValue(undefined),
        generateTraceId: jest.fn().mockReturnValue('mock-trace-id'),
        generateSpanId: jest.fn().mockReturnValue('mock-span-id')
    },
    DatadogProvider: DatadogProviderMock,
    DdSdk: {
        initialize: jest
            .fn()
            .mockImplementation(() => new Promise(resolve => resolve())),
        configurationFromString: jest
            .fn()
            .mockImplementation(
                wire =>
                    new Promise(resolve =>
                        resolve(mockConfigurationFromString(wire))
                    )
            ),
        configurationToString: jest
            .fn()
            .mockImplementation(
                configuration =>
                    new Promise(resolve => resolve(configuration.wire ?? '{}'))
            ),
        setConfiguration: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve(mockFlagsDebugState))
            ),
        setEvaluationContext: jest
            .fn()
            .mockImplementation(
                context =>
                    new Promise(resolve =>
                        resolve({
                            ...mockFlagsDebugState,
                            currentContext: context
                        })
                    )
            ),
        resolveBooleanEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveStringEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveNumberEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        resolveObjectEvaluation: jest
            .fn()
            .mockImplementation(
                (flagKey, defaultValue) =>
                    new Promise(resolve =>
                        resolve({
                            flagKey,
                            value: defaultValue,
                            reason: 'DEFAULT'
                        })
                    )
            ),
        getProviderDebugState: jest
            .fn()
            .mockImplementation(
                () => new Promise(resolve => resolve(mockFlagsDebugState))
            )
    }
};
