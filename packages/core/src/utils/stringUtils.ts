/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Returns the number of bytes needed to encode a string in UTF-8.
 *
 * Works in all JS environments (Hermes, JSC, Node.js) — no TextEncoder or
 * deprecated APIs required.
 *
 * Handles surrogate pairs correctly: a valid high+low pair counts as 4 bytes.
 * Lone surrogates (unpaired high or low) each count as 3 bytes, matching the
 * WTF-8 / WHATWG encoding convention for malformed strings.
 */
export function utf8ByteLength(str: string): number {
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes += 1;
        } else if (code < 0x800) {
            bytes += 2;
        } else if (code >= 0xd800 && code <= 0xdbff) {
            // High surrogate — check for a following low surrogate
            const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
            if (next >= 0xdc00 && next <= 0xdfff) {
                i += 1; // consume the low surrogate
                bytes += 4;
            } else {
                bytes += 3; // lone high surrogate
            }
        } else if (code >= 0xdc00 && code <= 0xdfff) {
            bytes += 3; // lone low surrogate
        } else {
            bytes += 3;
        }
    }
    return bytes;
}
