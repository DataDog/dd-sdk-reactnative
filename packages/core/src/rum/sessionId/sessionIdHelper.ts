/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeModules } from 'react-native';

import { createNativeEventEmitterForModule } from '../../sdk/EventEmitter/EventEmitter';

const RUM_SESSION_STARTED_EVENT_KEY = 'RumSessionStarted';

let cachedRumSessionId: string | null;

/**
 * [INTERNAL API]
 * Registers a listener for the native 'RumSessionStarted' event, to update
 * the cached Session ID.
 */
export const registerRumSessionIdListener = () => {
    const eventEmitter = createNativeEventEmitterForModule(NativeModules.DdSdk);
    if (eventEmitter.listenerCount(RUM_SESSION_STARTED_EVENT_KEY) > 0) {
        return;
    }

    eventEmitter.addListener(RUM_SESSION_STARTED_EVENT_KEY, (event: any) => {
        const field = 'sessionId';
        const sessionId = event[field] as string | null;
        cachedRumSessionId = sessionId;
    });
};

/**
 * [INTERNAL API]
 * Removes all listeners for the native 'RumSessionStarted' event (USEFUL FOR TESTING).
 */
export const removeRumSessionIdListeners = () => {
    const eventEmitter = createNativeEventEmitterForModule(NativeModules.DdSdk);
    eventEmitter.removeAllListeners(RUM_SESSION_STARTED_EVENT_KEY);
};

/**
 * [INTERNAL API]
 * Returns the cached RUM Session ID, updated either by:
 * - `RUMSessionStarted` events from the native layer
 * - Calls to `DdRum.getCurrentSessionId()` public API
 * @returns The cached RUM Session ID.
 */
export const getCachedRumSessionId = (): string | null => {
    return cachedRumSessionId ?? null;
};

/**
 * [INTERNAL API]
 * Manually overrides the cached RUM Session ID.
 * @param sessionId The RUM Session ID to set (or null).
 */
export const setCachedRumSessionId = (sessionId: string | null) => {
    cachedRumSessionId = sessionId;
};
