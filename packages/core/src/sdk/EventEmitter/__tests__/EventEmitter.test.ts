/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import type { NativeModule } from 'react-native';
import { NativeModules, Platform } from 'react-native';

const mockPlatform = (platform: typeof Platform.OS) => {
    Object.defineProperty(Platform, 'OS', {
        value: platform
    });
};

describe('EventEmitter', () => {
    let defaultPlatform: typeof Platform.OS;
    const createNativeEventEmitterMock = jest.fn();

    beforeAll(() => {
        createNativeEventEmitterMock.mockReturnValue({});
    });

    beforeEach(() => {
        defaultPlatform = Platform.OS;
        createNativeEventEmitterMock.mockClear();
        jest.resetModules();
    });

    afterEach(() => {
        mockPlatform(defaultPlatform);
    });

    it('M createNativeEventEmitterForModule returns valid event emitter W { platform = Android, NativeModules = undefined }', () => {
        // GIVEN
        mockPlatform('android');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        // WHEN
        const eventEmitter = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter).toBeDefined();
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith();
    });

    it('M createNativeEventEmitterForModule returns valid event emitter W { platform = iOS, NativeModules = undefined }', () => {
        // GIVEN
        mockPlatform('ios');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        // WHEN
        const eventEmitter = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter).toBeDefined();
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith(
            // iOS expects an object of type NativeModule to be passed
            expect.objectContaining({
                addListener: expect.any(Function),
                removeListeners: expect.any(Function)
            } as NativeModule)
        );
    });

    it('M createNativeEventEmitterForModule returns valid event emitter W { platform = Android, NativeModules != undefined }', () => {
        // GIVEN
        mockPlatform('android');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };

        // WHEN
        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter).toBeDefined();
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith();
    });

    it('M createNativeEventEmitterForModule returns valid event emitter W { platform= iOS, NativeModules != undefined }', () => {
        // GIVEN
        mockPlatform('ios');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        const nativeModuleMock = {
            addListener: () => {
                /* empty */
            },
            removeListeners: () => {
                /* empty */
            },
            testFunction: () => {
                /* empty */
            }
        };

        // WHEN
        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter).toBeDefined();
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith(
            nativeModuleMock
        );
    });

    it('M createNativeEventEmitterForModule initializes NativeEventEmitter only once W { platform = Android }', () => {
        // GIVEN
        mockPlatform('android');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        // WHEN
        const eventEmitter1 = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );
        const eventEmitter2 = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter1).toBeDefined();
        expect(eventEmitter2).toBeDefined();
        expect(eventEmitter1).toBe(eventEmitter2);
        expect(createNativeEventEmitterMock).toHaveBeenCalledTimes(1);
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith();
    });

    it('M createNativeEventEmitterForModule initializes NativeEventEmitter only once W { platform = iOS }', () => {
        // GIVEN
        mockPlatform('ios');
        const createNativeEventEmitterForModule = require('../EventEmitter')
            .createNativeEventEmitterForModule;

        // WHEN
        const eventEmitter1 = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );
        const eventEmitter2 = createNativeEventEmitterForModule(
            NativeModules.DdSdk,
            createNativeEventEmitterMock
        );

        // THEN
        expect(eventEmitter1).toBeDefined();
        expect(eventEmitter2).toBeDefined();
        expect(eventEmitter1).toBe(eventEmitter2);
        expect(createNativeEventEmitterMock).toHaveBeenCalledTimes(1);
        expect(createNativeEventEmitterMock).toHaveBeenCalledWith(
            expect.objectContaining({
                addListener: expect.any(Function),
                removeListeners: expect.any(Function)
            })
        );
    });
});
