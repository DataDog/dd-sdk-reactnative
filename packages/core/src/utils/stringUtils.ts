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
 */
export function utf8ByteLength(str: string): number {
    let bytes = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes += 1;
        } else if (code < 0x800) {
            bytes += 2;
        } else if (code < 0xd800 || code >= 0xe000) {
            bytes += 3;
        } else {
            i += 1; // surrogate pair — consume low surrogate, emit 4 bytes
            bytes += 4;
        }
    }
    return bytes;
}
