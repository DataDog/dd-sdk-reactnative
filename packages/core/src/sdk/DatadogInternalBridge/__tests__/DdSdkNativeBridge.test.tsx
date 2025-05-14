/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

import { NativeModules } from 'react-native';

import { DdSdkReactNativeConfiguration } from '../../../DdSdkReactNativeConfiguration';
import type { DdSdkNativeBridgeSpec } from '../DdSdkNativeBridgeSpec';

const mockBatchedBridge = {
    registerCallableModule: jest.fn()
};

const mockSessionIdHelper = {
    pollForSessionId: jest.fn(),
    verifySessionId: jest.fn()
};

const mockNativeDdSdkSpec = {
    onRUMSessionStarted: jest.fn()
};

const mockErrorHandler = jest.fn();

const mockInternalBridge: DdSdkNativeBridgeSpec = {
    __datadogRumSessionStarted: jest.fn()
};

describe('DdSdkNativeBridge', () => {
    beforeEach(() => {
        jest.mock('../../DdSdk', () => ({
            DdSdk: {
                initialize: jest.fn()
            }
        }));

        jest.mock(
            'react-native/Libraries/BatchedBridge/BatchedBridge',
            () => mockBatchedBridge
        );

        jest.mock(
            '../../../rum/sessionId/sessionIdHelper.ts',
            () => mockSessionIdHelper
        );

        jest.mock('../../../specs/NativeDdSdk', () => mockNativeDdSdkSpec);
    });

    afterEach(() => {
        jest.resetModules();
        jest.resetAllMocks();
        delete global.RN$Bridgeless;
    });

    describe('new architecture implementation', () => {
        beforeEach(() => {
            (global as any).RN$Bridgeless = true;
        });

        it('does not try to register the batched bridge when index is imported', () => {
            const ddBridge = require('../DdSdkNativeBridge');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);
            expect(
                mockBatchedBridge.registerCallableModule
            ).toHaveBeenCalledTimes(0);
            expect(ddBridge.hasNativeBridge()).toBe(true);
        });

        it('registers onRUMSessionStarted event listener callback', () => {
            const ddBridge = require('../DdSdkNativeBridge');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);
            expect(
                mockNativeDdSdkSpec.onRUMSessionStarted
            ).toHaveBeenCalledWith(
                mockInternalBridge.__datadogRumSessionStarted
            );
        });

        it('catches errors when native spec import fails', () => {
            jest.mock('../../../specs/NativeDdSdk', () => undefined);

            const ddBridge = require('../DdSdkNativeBridge');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);

            expect(mockErrorHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        'registerNativeBridge() ERROR: NativeDdSdk is undefined'
                })
            );
            expect(
                mockNativeDdSdkSpec.onRUMSessionStarted
            ).toHaveBeenCalledTimes(0);
        });

        it('session ID is polled when event listener setup failed', async () => {
            const ddBridge = require('../DdSdkNativeBridge');
            const ddSdkRn = require('../../../DdSdkReactNative');
            jest.mock(
                'react-native/Libraries/BatchedBridge/BatchedBridge',
                () => {
                    throw new Error('Import failed');
                }
            );
            jest.mock('../../../specs/NativeDdSdk', () => undefined);

            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);

            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await ddSdkRn.DdSdkReactNative.initialize(configuration);

            // THEN
            expect(ddBridge.hasNativeBridge()).toBe(false);
            expect(mockSessionIdHelper.pollForSessionId).toHaveBeenCalled();
            expect(mockSessionIdHelper.verifySessionId).toHaveBeenCalledTimes(
                0
            );
            expect(mockErrorHandler).toHaveBeenCalled();
        });

        it('session ID is verified when event listener setup succeeds', async () => {
            const ddBridge = require('../DdSdkNativeBridge');
            const ddSdkRn = require('../../../DdSdkReactNative');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);

            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await ddSdkRn.DdSdkReactNative.initialize(configuration);

            // THEN
            expect(ddBridge.hasNativeBridge()).toBe(true);
            expect(mockSessionIdHelper.verifySessionId).toHaveBeenCalled();
            expect(mockSessionIdHelper.pollForSessionId).toHaveBeenCalledTimes(
                0
            );
            expect(mockErrorHandler).toHaveBeenCalledTimes(0);
        });
    });

    describe('old architecture implementation', () => {
        beforeEach(() => {
            (global as any).RN$Bridgeless = false;
        });

        it('does not try to register the event listener when index is imported', () => {
            const ddBridge = require('../DdSdkNativeBridge');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);
            expect(
                mockNativeDdSdkSpec.onRUMSessionStarted
            ).toHaveBeenCalledTimes(0);
            expect(ddBridge.hasNativeBridge()).toBe(true);
        });

        it('registers the bridge when index is imported', () => {
            const ddBridge = require('../DdSdkNativeBridge');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);
            expect(mockBatchedBridge.registerCallableModule).toHaveBeenCalled();
            expect(ddBridge.hasNativeBridge()).toBe(true);
            expect(mockErrorHandler).toHaveBeenCalledTimes(0);
        });

        it('hasBatchedBridge is false when batched bridge import fails', () => {
            const ddBridge = require('../DdSdkNativeBridge');
            jest.mock(
                'react-native/Libraries/BatchedBridge/BatchedBridge',
                () => {
                    throw new Error('TEST IMPORT FAILED');
                }
            );
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);
            expect(ddBridge.hasNativeBridge()).toBe(false);
            expect(mockErrorHandler).toHaveBeenCalled();
        });

        it('session ID is polled when batched bridge setup failed', async () => {
            const ddBridge = require('../DdSdkNativeBridge');
            const ddSdkRn = require('../../../DdSdkReactNative');
            jest.mock(
                'react-native/Libraries/BatchedBridge/BatchedBridge',
                () => {
                    throw new Error('Import failed');
                }
            );
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);

            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await ddSdkRn.DdSdkReactNative.initialize(configuration);

            // THEN
            expect(ddBridge.hasNativeBridge()).toBe(false);
            expect(mockSessionIdHelper.pollForSessionId).toHaveBeenCalled();
            expect(mockSessionIdHelper.verifySessionId).toHaveBeenCalledTimes(
                0
            );
            expect(mockErrorHandler).toHaveBeenCalled();
        });

        it('session ID is verified when batched bridge setup succeeds', async () => {
            const ddBridge = require('../DdSdkNativeBridge');
            const ddSdkRn = require('../../../DdSdkReactNative');
            ddBridge.registerNativeBridge(mockInternalBridge, mockErrorHandler);

            // GIVEN
            const fakeAppId = '1';
            const fakeClientToken = '2';
            const fakeEnvName = 'env';
            const configuration = new DdSdkReactNativeConfiguration(
                fakeClientToken,
                fakeEnvName,
                fakeAppId
            );

            NativeModules.DdSdk.initialize.mockResolvedValue(null);

            // WHEN
            await ddSdkRn.DdSdkReactNative.initialize(configuration);

            // THEN
            expect(ddBridge.hasNativeBridge()).toBe(true);
            expect(mockSessionIdHelper.verifySessionId).toHaveBeenCalled();
            expect(mockSessionIdHelper.pollForSessionId).toHaveBeenCalledTimes(
                0
            );
            expect(mockErrorHandler).toHaveBeenCalledTimes(0);
        });
    });
});
