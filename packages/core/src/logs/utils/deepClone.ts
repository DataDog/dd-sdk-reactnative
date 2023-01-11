/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const isDate = (object: unknown): object is Date => {
    const type = {}.toString.call(object).slice(8, -1);
    return type === 'Date';
};

const isArray = (object: unknown): object is unknown[] => {
    const type = {}.toString.call(object).slice(8, -1);
    return type === 'Array';
};

const isObject = (object: unknown): object is Record<string, unknown> => {
    const type = {}.toString.call(object).slice(8, -1);
    return type === 'Object';
};

const isSet = (object: unknown): object is Set<unknown> => {
    const type = {}.toString.call(object).slice(8, -1);
    return type === 'Set';
};

const isMap = (object: unknown): object is Map<string, unknown> => {
    const type = {}.toString.call(object).slice(8, -1);
    return type === 'Map';
};

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
    if (isDate(originalObject)) {
        return new Date(originalObject.getTime()) as T;
    }
    if (isSet(originalObject)) {
        return new Set([...originalObject].map(value => deepClone(value))) as T;
    }
    if (isMap(originalObject)) {
        return new Map(
            [...originalObject].map(kv => [deepClone(kv[0]), deepClone(kv[1])])
        ) as T;
    }
    if (isArray(originalObject)) {
        if (depth >= 7) {
            // Break the circular reference here
            return originalObject;
        }
        const result: unknown[] = [];
        // eslint-disable-next-line guard-for-in
        for (const key in originalObject) {
            // include prototype properties
            result[key] = deepClone(originalObject[key], depth + 1);
        }

        return result as T;
    }
    if (isObject(originalObject)) {
        if (depth >= 7) {
            // Break the circular reference here
            return originalObject;
        }
        const result: Record<string, unknown> = {};
        // eslint-disable-next-line guard-for-in
        for (const key in originalObject) {
            // include prototype properties
            result[key] = deepClone(originalObject[key], depth + 1);
        }

        return result as T;
    }

    // primitives and non-supported objects (e.g. functions) land here
    return originalObject;
};
