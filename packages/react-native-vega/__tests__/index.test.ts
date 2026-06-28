/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Mock the Kepler TurboModule specs before any imports
jest.mock('../src/turbo-modules/NativeDdSdk', () => ({
    __esModule: true,
    default: {
        initialize: jest.fn(),
        addAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        addAttributes: jest.fn(),
        removeAttributes: jest.fn(),
        setUserInfo: jest.fn(),
        clearUserInfo: jest.fn(),
        addUserExtraInfo: jest.fn(),
        setAccountInfo: jest.fn(),
        clearAccountInfo: jest.fn(),
        addAccountExtraInfo: jest.fn(),
        setTrackingConsent: jest.fn(),
        sendTelemetryLog: jest.fn(),
        telemetryDebug: jest.fn(),
        telemetryError: jest.fn(),
        consumeWebviewEvent: jest.fn(),
        clearAllData: jest.fn(),
        httpResponse: jest.fn()
    }
}));

jest.mock('../src/turbo-modules/NativeDdRum', () => ({
    __esModule: true,
    default: {
        startView: jest.fn(),
        stopView: jest.fn(),
        startAction: jest.fn(),
        stopAction: jest.fn(),
        addAction: jest.fn(),
        startResource: jest.fn(),
        stopResource: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
        addViewAttribute: jest.fn(),
        removeViewAttribute: jest.fn(),
        addViewAttributes: jest.fn(),
        removeViewAttributes: jest.fn(),
        addViewLoadingTime: jest.fn(),
        stopSession: jest.fn(),
        addFeatureFlagEvaluation: jest.fn(),
        getCurrentSessionId: jest.fn(),
        startFeatureOperation: jest.fn(),
        succeedFeatureOperation: jest.fn(),
        failFeatureOperation: jest.fn()
    }
}));

import * as VegaExports from '../src/index';

describe('Vega package exports', () => {
    it('exports DdSdkReactNative (Vega wrapper)', () => {
        expect(VegaExports.DdSdkReactNative).toBeDefined();
        expect(VegaExports.DdSdkReactNative.initialize).toBeDefined();
        expect(VegaExports.DdSdkReactNative.setTrackingConsent).toBeDefined();
    });

    it('exports DdRum (Vega wrapper)', () => {
        expect(VegaExports.DdRum).toBeDefined();
        expect(VegaExports.DdRum.startView).toBeDefined();
        expect(VegaExports.DdRum.stopView).toBeDefined();
        expect(VegaExports.DdRum.addError).toBeDefined();
    });

    it('exports DatadogProvider (Vega wrapper)', () => {
        expect(VegaExports.DatadogProvider).toBeDefined();
    });

    it('exports DatadogProviderConfiguration from core', () => {
        expect(VegaExports.DatadogProviderConfiguration).toBeDefined();
    });

    it('exports RUM enums from core', () => {
        expect(VegaExports.RumActionType).toBeDefined();
        expect(VegaExports.ErrorSource).toBeDefined();
        expect(VegaExports.TrackingConsent).toBeDefined();
    });

    it('exports config classes from core', () => {
        expect(VegaExports.BatchSize).toBeDefined();
        expect(VegaExports.UploadFrequency).toBeDefined();
        expect(VegaExports.BatchProcessingLevel).toBeDefined();
    });

    it('exports HTTP proxy', () => {
        expect(VegaExports.startHttpProxy).toBeDefined();
    });

    it('does NOT export DdLogs, DdTrace, DdFlags', () => {
        expect((VegaExports as any).DdLogs).toBeUndefined();
        expect((VegaExports as any).DdTrace).toBeUndefined();
        expect((VegaExports as any).DdFlags).toBeUndefined();
    });
});
