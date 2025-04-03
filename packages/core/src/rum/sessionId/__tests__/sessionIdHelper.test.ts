/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import { createNativeEventEmitterForModule } from '../../../sdk/EventEmitter/EventEmitter';

describe('sessionIdHelper', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    it('M registerRumSessionIdListener correctly registers a listener for RumSessionStarted', () => {
        // GIVEN
        const { registerRumSessionIdListener } = require('../sessionIdHelper');
        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };

        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock
        );

        // WHEN
        registerRumSessionIdListener();

        // THEN
        expect(eventEmitter.listenerCount('RumSessionStarted')).toBe(1);
    });

    it('M registerRumSessionIdListener does not register more than one listener for RumSessionStarted', () => {
        // GIVEN
        const { registerRumSessionIdListener } = require('../sessionIdHelper');

        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };

        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock
        );

        // WHEN
        registerRumSessionIdListener();
        registerRumSessionIdListener();
        registerRumSessionIdListener();

        // THEN
        expect(eventEmitter.listenerCount('RumSessionStarted')).toBe(1);
    });

    it('M removeRumSessionIdListeners should remove RumSessionStarted listener', () => {
        // GIVEN
        const {
            registerRumSessionIdListener,
            removeRumSessionIdListeners
        } = require('../sessionIdHelper');

        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };
        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock
        );

        registerRumSessionIdListener();
        expect(eventEmitter.listenerCount('RumSessionStarted')).toBe(1);

        // WHEN
        removeRumSessionIdListeners();

        // THEN
        expect(eventEmitter.listenerCount('RumSessionStarted')).toBe(0);
    });

    it('M getCachedRumSessionId should return null W { cachedRumSessionId has not been set }', () => {
        // GIVEN
        const { getCachedRumSessionId } = require('../sessionIdHelper');

        // WHEN
        const sessionId = getCachedRumSessionId();

        // THEN
        expect(sessionId).toBeNull();
    });

    it('M getCachedRumSessionId should return cached RUM Session ID W { cachedRumSessionId has been set }', () => {
        // GIVEN
        const {
            setCachedRumSessionId,
            getCachedRumSessionId
        } = require('../sessionIdHelper');

        setCachedRumSessionId('TEST_SESSION_ID');

        // WHEN
        const sessionId = getCachedRumSessionId();

        // THEN
        expect(sessionId).toBe('TEST_SESSION_ID');
    });

    it('M getCachedRumSessionId should return sessionID W { registered listener is called }', () => {
        // GIVEN
        const {
            registerRumSessionIdListener,
            getCachedRumSessionId
        } = require('../sessionIdHelper');

        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };
        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock
        );

        registerRumSessionIdListener();

        // WHEN
        const event = {
            sessionId: 'LISTENER_TEST_SESSION_ID'
        };
        eventEmitter.emit('RumSessionStarted', event);

        // THEN
        expect(getCachedRumSessionId()).toBe('LISTENER_TEST_SESSION_ID');
    });

    it('M getCachedRumSessionId should be null W { registered listener is called with undefined value }', () => {
        // GIVEN
        const {
            registerRumSessionIdListener,
            getCachedRumSessionId
        } = require('../sessionIdHelper');

        const nativeModuleMock = {
            addListener: jest.fn(),
            removeListeners: jest.fn()
        };
        const eventEmitter = createNativeEventEmitterForModule(
            nativeModuleMock
        );

        registerRumSessionIdListener();

        // WHEN
        const event = {
            sessionId: undefined
        };
        eventEmitter.emit('RumSessionStarted', event);

        // THEN
        expect(getCachedRumSessionId()).toBeNull();
    });
});
