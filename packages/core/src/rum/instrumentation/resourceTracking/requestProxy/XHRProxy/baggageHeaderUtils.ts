/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../SdkVerbosity';

// The resulting baggage-string should contain 64 list-members or less (https://www.w3.org/TR/baggage/#limits)
const MAX_MEMBERS = 64;

// The resulting baggage-string should be of size 8192 bytes or less (https://www.w3.org/TR/baggage/#limits)
const MAX_BYTES = 8192;

// The keys must follow RFC 7230 token grammar (https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.6)
const TOKEN_REGEX = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

/**
 * Lazy property for {@link getBaggageHeaderSafeChars}.
 */
let baggageHeaderSafeChars: Set<string> | undefined;

/**
 * Transform a Set of baggage entries (strings like "key=value;prop1=foo;prop2")
 * into a compliant baggage header value per W3C Baggage spec.
 */
export function formatBaggageHeader(entries: Set<string>): string | null {
    const formattedParts: string[] = [];

    for (const rawEntry of entries) {
        if (!rawEntry.includes('=')) {
            InternalLog.log(
                'XHRProxy: Dropped invalid baggage header entry - expected format "key=value".',
                SdkVerbosity.WARN
            );
            continue;
        }

        // Split first key=value from properties (properties are after first ';')
        const [mainPart, ...rawProperties] = rawEntry.split(';');
        const idx = mainPart.indexOf('=');
        if (idx <= 0) {
            InternalLog.log(
                "XHRProxy: Dropped invalid baggage header entry - no '=' or empty key",
                SdkVerbosity.WARN
            );
            continue;
        }

        const rawKey = mainPart.slice(0, idx).trim();
        const rawValue = mainPart.slice(idx + 1).trim();

        if (!TOKEN_REGEX.test(rawKey)) {
            InternalLog.log(
                'XHRProxy: Dropped invalid baggage header entry - key not compliant to RFC 7230 token grammar',
                SdkVerbosity.WARN
            );
            continue;
        }

        const encodedValue = encodeValue(rawValue);

        // Handle properties
        const properties: string[] = [];
        for (const rawProperty of rawProperties) {
            const trimmed = rawProperty.trim();
            if (!trimmed) {
                continue;
            }

            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) {
                // Property with no value (key1=value1;prop1; ... )
                const propKey = trimmed.trim();
                if (!TOKEN_REGEX.test(propKey)) {
                    InternalLog.log(
                        'XHRProxy: Dropped invalid baggage header entry - property key not compliant to RFC 7230 token grammar',
                        SdkVerbosity.WARN
                    );
                    continue;
                }
                properties.push(propKey);
            } else {
                // Property in key-value format (key1=value1;prop1=propValue1; ... )
                const propKey = trimmed.slice(0, eqIdx).trim();
                const propVal = trimmed.slice(eqIdx + 1).trim();
                if (!TOKEN_REGEX.test(propKey)) {
                    InternalLog.log(
                        'XHRProxy: Dropped invalid baggage header entry - key-value property key not compliant to RFC 7230 token grammar',
                        SdkVerbosity.WARN
                    );
                    continue;
                }
                properties.push(`${propKey}=${encodeValue(propVal)}`);
            }
        }

        const joinedProps = properties.length ? `;${properties.join(';')}` : '';
        formattedParts.push(`${rawKey}=${encodedValue}${joinedProps}`);
    }

    if (formattedParts.length > MAX_MEMBERS) {
        InternalLog.log(
            `XHRProxy: Too many baggage members: ${formattedParts.length} > ${MAX_MEMBERS} - entries might be dropped (https://www.w3.org/TR/baggage/#limits)`,
            SdkVerbosity.WARN
        );
    } else if (formattedParts.length === 0) {
        return null;
    }

    const headerValue = formattedParts.join(',');
    const byteLength = Buffer.byteLength(headerValue, 'utf8');

    if (byteLength > MAX_BYTES) {
        InternalLog.log(
            `Baggage header too large: ${byteLength} bytes > ${MAX_BYTES} - entries might be dropped (https://www.w3.org/TR/baggage/#limits)`,
            SdkVerbosity.WARN
        );
    }

    return headerValue;
}

/**
 * Returns a set of valid baggage header characters.
 */
function getBaggageHeaderSafeChars(): Set<string> {
    if (baggageHeaderSafeChars) {
        return baggageHeaderSafeChars;
    }

    const safeChars = new Set<string>();
    for (let c = 0x21; c <= 0x7e; c++) {
        if (
            c === 0x22 ||
            c === 0x2c ||
            c === 0x3b ||
            c === 0x5c ||
            c === 0x20
        ) {
            continue;
        }
        safeChars.add(String.fromCharCode(c));
    }

    baggageHeaderSafeChars = safeChars;

    return safeChars;
}

/*
 * Percent-encode all characters outside baggage-octet range.
 */
function encodeValue(raw: string): string {
    const safeChars = getBaggageHeaderSafeChars();
    let result = '';
    for (const ch of Array.from(raw)) {
        if (safeChars.has(ch)) {
            result += ch;
        } else {
            const utf8Bytes = Buffer.from(ch, 'utf8');
            for (const value of utf8Bytes) {
                result += `%${value
                    .toString(16)
                    .toUpperCase()
                    .padStart(2, '0')}`;
            }
        }
    }
    return result;
}
