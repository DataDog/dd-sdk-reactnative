/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// eslint-disable-next-line import/no-mutable-exports
let debugId: any | null = null;

/**
 * Loads the Datadog Debug ID dynamically
 */
function loadDebugId() {
    if (typeof globalThis === 'undefined') {
        return;
    }
    try {
        const debugIds = (globalThis as any)._datadogDebugIds;
        if (!debugIds || Object.keys(debugIds).length === 0) {
            if (process.env.NODE_ENV !== 'test') {
                console.warn(
                    '[Datadog SDK] Debug ID not found. Are you using @datadog/mobile-react-native/metro config?'
                );
            }
            return;
        }

        debugId = debugIds[Object.keys(debugIds)[0]];
    } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn(
                '[Datadog SDK] Error while retrieving Debug ID. Are you using @datadog/mobile-react-native/metro config?'
            );
        }
    }
}

loadDebugId();

export { debugId };
