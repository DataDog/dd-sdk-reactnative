/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/** Keep a missing or failing native bridge from breaking the host app. */
export const callNative = async <T>(
    resolve: () => T | null,
    call: (native: T) => Promise<unknown>
): Promise<boolean> => {
    try {
        const native = resolve();
        if (!native) {
            return false;
        }
        return (await call(native)) !== false;
    } catch {
        return false;
    }
};
