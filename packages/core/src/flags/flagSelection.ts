/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagSelection } from './types';

// Same text as the browser SDK and the other Datadog SDKs that report `malformed_selection`.
export const MALFORMED_FLAG_SELECTION_MESSAGE =
    'flagSelection was not sent (malformed_selection: flagSelection must be an object with optional tags and keyPatterns string arrays). Loading the full flag configuration.';

// Lookbehind is unsupported by older JS engines, so the low-surrogate branch consumes the preceding character.
const UNPAIRED_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/;

export type NativeFlagSelection = { tags?: string[]; keyPatterns?: string[] };

export type FlagSelectionResult =
    | { kind: 'none' }
    | { kind: 'malformed' }
    | { kind: 'selected'; selection: NativeFlagSelection };

/**
 * Returns a copy of the list, `undefined` when the list is absent, or `false` when it is malformed.
 */
const copyStringList = (value: unknown): string[] | undefined | false => {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    const copy: string[] = [];
    // An index loop visits holes, which `every` and `forEach` skip.
    for (let i = 0; i < value.length; i++) {
        const element: unknown = value[i];
        if (typeof element !== 'string' || UNPAIRED_SURROGATE.test(element)) {
            return false;
        }
        copy.push(element);
    }
    return copy;
};

/**
 * Checks what the native bridges can't carry: the shape, and unpaired UTF-16 surrogates.
 * Canonicalization and limits are left to the native SDKs.
 */
export const validateFlagSelection = (input: unknown): FlagSelectionResult => {
    if (input === undefined || input === null) {
        return { kind: 'none' };
    }
    try {
        if (typeof input !== 'object' || Array.isArray(input)) {
            return { kind: 'malformed' };
        }
        const { tags, keyPatterns } = input as FlagSelection;
        const tagsCopy = copyStringList(tags);
        const keyPatternsCopy = copyStringList(keyPatterns);
        if (tagsCopy === false || keyPatternsCopy === false) {
            return { kind: 'malformed' };
        }
        if (tagsCopy === undefined && keyPatternsCopy === undefined) {
            return { kind: 'none' };
        }

        const selection: NativeFlagSelection = {};
        if (tagsCopy !== undefined) {
            selection.tags = tagsCopy;
        }
        if (keyPatternsCopy !== undefined) {
            selection.keyPatterns = keyPatternsCopy;
        }
        return { kind: 'selected', selection };
    } catch {
        // Getters and proxies in app-provided objects can throw.
        return { kind: 'malformed' };
    }
};
