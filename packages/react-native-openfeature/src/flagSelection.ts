/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { FlagSelection, FlagSelectionError } from '@datadog/flagging-core';
import {
    canonicalizeFlagSelection,
    MAX_FLAG_SELECTION_KEY_PATTERN_BYTES,
    MAX_FLAG_SELECTION_TAG_BYTES,
    MAX_FLAG_SELECTION_VALUES
} from '@datadog/flagging-core';

// Fastly answers URLs over 8 KB with 414 URI Too Long: https://docs.fastly.com/products/network-services-resource-limits
// Keep encoding and this limit aligned with openfeature-js-client's transport/flagSelection.ts.
const MAX_RULES_URL_BYTES = 8192;

const LIMIT_DESCRIPTIONS: Record<FlagSelectionError, string> = {
    malformed_selection:
        'flagSelection must be an object with optional tags and keyPatterns string arrays',
    too_many_values: `each list accepts at most ${MAX_FLAG_SELECTION_VALUES} values`,
    invalid_key_pattern: `each key pattern is at most ${MAX_FLAG_SELECTION_KEY_PATTERN_BYTES} UTF-8 bytes`,
    invalid_tag: `each tag is at most ${MAX_FLAG_SELECTION_TAG_BYTES} UTF-8 bytes`
};

type SelectionLogger = { error(message: string): void };

export function reportSelectionError(
    logger: SelectionLogger,
    message: string
): void {
    try {
        logger.error(message);
    } catch {
        // Diagnostics must not prevent configuration loading or replace a fetch error.
    }
}

export function applyFlagSelection(
    url: string,
    input: FlagSelection | undefined,
    logger: SelectionLogger
): { url: string; selected: boolean } {
    const drop = (
        reason: FlagSelectionError,
        limit = LIMIT_DESCRIPTIONS[reason]
    ) => {
        reportSelectionError(
            logger,
            `flagSelection was not sent (${reason}: ${limit}). Loading the full flag configuration.`
        );
        return { url, selected: false };
    };
    try {
        const { selection, error } = canonicalizeFlagSelection(input);
        if (error) {
            return drop(error);
        }
        if (!selection) {
            return { url, selected: false };
        }
        const params = [
            ...selection.tags.map(
                tag => `selected_flag_tags=${encodeQueryValue(tag)}`
            ),
            ...selection.keyPatterns.map(
                pattern =>
                    `selected_flag_key_patterns=${encodeQueryValue(pattern)}`
            )
        ];
        const selectedUrl = `${url}&${params.join('&')}`;
        // Percent-encoding makes the complete URL ASCII, so its length is its byte length.
        if (selectedUrl.length > MAX_RULES_URL_BYTES) {
            return drop(
                'too_many_values',
                `the request URL is at most ${MAX_RULES_URL_BYTES} bytes`
            );
        }
        return { url: selectedUrl, selected: true };
    } catch {
        // Getters, proxies, and encoding failures can expose caller data through raw errors.
        return drop('malformed_selection');
    }
}

function encodeQueryValue(value: string): string {
    return encodeURIComponent(value).replace(
        /[!'()*]/g,
        char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
    );
}
