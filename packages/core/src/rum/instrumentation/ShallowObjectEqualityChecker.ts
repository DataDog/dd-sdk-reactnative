/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Does a shallow comparison between 2 objects
 */
export const areObjectShallowEqual = (
    objectA: Record<string, unknown>,
    objectB: Record<string, unknown>
): boolean => {
    const keys = Object.keys(objectA);
    if (keys.length !== Object.keys(objectB).length) return false;
    for (const key of keys) {
        if (objectA[key] !== objectB[key]) return false;
    }
    return true;
};
