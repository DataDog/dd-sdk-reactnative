/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
export const getGlobalInstance = <T>(
    key: string,
    objectConstructor: () => T
): T => {
    const symbol = Symbol.for(key);
    const g = (globalThis as unknown) as Record<PropertyKey, unknown>;

    if (!(symbol in g)) {
        g[symbol] = objectConstructor();
    }
    return g[symbol] as T;
};
