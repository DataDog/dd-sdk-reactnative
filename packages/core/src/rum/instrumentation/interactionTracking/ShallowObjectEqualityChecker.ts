/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Does a shallow comparison between 2 objects.
 *
 * In some rare cases, one of the objects can be `undefined` or `null`.
 * This is documented in https://github.com/DataDog/dd-sdk-reactnative/issues/419.
 */
export const areObjectShallowEqual = (
    objectA: Record<string, unknown> | undefined | null,
    objectB: Record<string, unknown> | undefined | null
): boolean => {
    // Handle edge case when one object is `undefined` or `null`
    if (!objectA || !objectB) {
        return objectA === objectB;
    }

    const keys = Object.keys(objectA);
    if (keys.length !== Object.keys(objectB).length) {
        return false;
    }
    for (const key of keys) {
        if (objectA[key] !== objectB[key]) {
            return false;
        }
    }
    return true;
};
