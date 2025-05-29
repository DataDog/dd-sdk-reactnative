/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A constant used to define a property that should be discarded from a {@link RequiredOrDiscard} object.
 */
export const DISCARD_PROPERTY = { _dd_meta_: 'DISCARD' };

/**
 * Used to change the type of every property of an object to be either required or {@link DISCARD_PROPERTY}.
 */
export type RequiredOrDiscard<T> = {
    [K in keyof T]-?: T[K] | typeof DISCARD_PROPERTY;
};

/**
 * Removes all entries of value {@link DISCARD_PROPERTY} from the given object
 * @param obj The object to remove the {@link DISCARD_PROPERTY} entries from.
 * @returns The object without the {@link DISCARD_PROPERTY} entries.
 */
export const removeDiscardProperties = <T extends Record<string, any>>(
    obj: T
): {
    [K in keyof T]: T[K] extends null ? undefined : T[K];
} => {
    const result = {} as any;

    Object.keys(obj).forEach(key => {
        const value = obj[key];
        result[key] = value === DISCARD_PROPERTY ? undefined : value;
    });

    return result;
};
