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
            return;
        }

        debugId = debugIds[Object.keys(debugIds)[0]];
    } catch (error) {
        /* empty */
    }
}

loadDebugId();

export { debugId };
