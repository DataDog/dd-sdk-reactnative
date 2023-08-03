/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const isDate = (type: string, _: unknown): _ is Date => {
    return type === 'Date';
};

const isArray = (type: string, _: unknown): _ is unknown[] => {
    return type === 'Array';
};

const isObject = (type: string, _: unknown): _ is Record<string, unknown> => {
    return type === 'Object';
};

const isSet = (type: string, _: unknown): _ is Set<unknown> => {
    return type === 'Set';
};

const isMap = (type: string, _: unknown): _ is Map<string, unknown> => {
    return type === 'Map';
};

/**
 * Be careful when changing this value, it can lead to performance issues: https://github.com/DataDog/dd-sdk-reactnative/issues/514.
 * Benchmark of average execution time for an action event mapper with different max depth on iOS simulator:
 * 7: 40ms
 * 6: 15ms
 * 5: 4ms
 * 4: <1ms
 */
const MAX_DEPTH = 4;

/**
 * Simple deep clone inspired from https://github.com/angus-c/just/blob/master/packages/collection-clone/index.cjs
 * Functions and RegExp will be returned as they are.
 * Maps and Sets are cloned even though they won't be accepted by React Native, just in case they are mutated by the user to avoid side effects.
 *
 * We added support for circular references by limiting the number of depth levels to 8.
 * @param originalObject
 * @returns
 */
export const deepClone = <T>(originalObject: T, depth: number = 0): T => {
    const type = {}.toString.call(originalObject).slice(8, -1);
    if (isDate(type, originalObject)) {
        return (new Date(originalObject.getTime()) as unknown) as T;
    }
    if (isSet(type, originalObject)) {
        return (new Set(
            [...originalObject].map(value => deepClone(value))
        ) as unknown) as T;
    }
    if (isMap(type, originalObject)) {
        return (new Map(
            [...originalObject].map(kv => [deepClone(kv[0]), deepClone(kv[1])])
        ) as unknown) as T;
    }
    if (isArray(type, originalObject)) {
        if (depth >= MAX_DEPTH) {
            // Break the circular reference here
            return originalObject;
        }
        const result: unknown[] = [];
        // eslint-disable-next-line guard-for-in
        for (const key in originalObject) {
            // include prototype properties
            result[key] = deepClone(originalObject[key], depth + 1);
        }

        return (result as unknown) as T;
    }
    if (isObject(type, originalObject)) {
        if (depth >= MAX_DEPTH) {
            // Break the circular reference here
            return originalObject;
        }
        const result: Record<string, unknown> = {};
        // eslint-disable-next-line guard-for-in
        for (const key in originalObject) {
            // include prototype properties
            result[key] = deepClone(originalObject[key], depth + 1);
        }

        return (result as unknown) as T;
    }

    // primitives and non-supported objects (e.g. functions) land here
    return originalObject;
};
