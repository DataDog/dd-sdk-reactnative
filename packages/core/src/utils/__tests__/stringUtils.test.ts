/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { utf8ByteLength } from '../stringUtils';

describe('utf8ByteLength', () => {
    describe('ASCII strings (1 byte per char)', () => {
        it('returns 0 for empty string', () => {
            expect(utf8ByteLength('')).toBe(0);
        });

        it('counts single ASCII character as 1 byte', () => {
            expect(utf8ByteLength('a')).toBe(1);
        });

        it('counts ASCII string correctly', () => {
            expect(utf8ByteLength('hello')).toBe(5);
        });
    });

    describe('2-byte characters (U+0080 – U+07FF)', () => {
        it('counts a 2-byte character correctly', () => {
            // 'é' is U+00E9 → 2 bytes in UTF-8
            expect(utf8ByteLength('é')).toBe(2);
        });

        it('counts mixed ASCII and 2-byte characters', () => {
            // 'café' → c(1) + a(1) + f(1) + é(2) = 5
            expect(utf8ByteLength('café')).toBe(5);
        });
    });

    describe('3-byte characters (U+0800 – U+FFFF, excluding surrogates)', () => {
        it('counts a 3-byte CJK character correctly', () => {
            // '中' is U+4E2D → 3 bytes in UTF-8
            expect(utf8ByteLength('中')).toBe(3);
        });

        it('counts a string of 3-byte characters correctly', () => {
            // '中文' → 3 + 3 = 6
            expect(utf8ByteLength('中文')).toBe(6);
        });
    });

    describe('4-byte characters — valid surrogate pairs', () => {
        it('counts a valid surrogate pair (emoji) as 4 bytes', () => {
            // '😀' is U+1F600, encoded as surrogate pair 😀
            expect(utf8ByteLength('😀')).toBe(4);
        });

        it('counts multiple emoji correctly', () => {
            expect(utf8ByteLength('😀😀')).toBe(8);
        });

        it('counts mixed ASCII and emoji', () => {
            // 'a😀b' → 1 + 4 + 1 = 6
            expect(utf8ByteLength('a😀b')).toBe(6);
        });
    });

    describe('unpaired surrogates — malformed strings', () => {
        it('counts a lone high surrogate as 3 bytes', () => {
            // \uD83D is a high surrogate not followed by a low surrogate
            const loneHigh = '\uD83D';
            expect(utf8ByteLength(loneHigh)).toBe(3);
        });

        it('counts a lone low surrogate as 3 bytes', () => {
            // \uDE00 is a low surrogate not preceded by a high surrogate
            const loneLow = '\uDE00';
            expect(utf8ByteLength(loneLow)).toBe(3);
        });

        it('does not under-count when a high surrogate is followed by a non-low-surrogate', () => {
            // \uD83D (high surrogate) + 'a' (not a low surrogate)
            // Should be 3 + 1 = 4, not 4 (treating as pair)
            const highPlusAscii = '\uD83Da';
            expect(utf8ByteLength(highPlusAscii)).toBe(4);
        });

        it('counts two consecutive lone surrogates as 6 bytes', () => {
            // \uD83D\uD83D — two high surrogates, each lone
            const twoHighSurrogates = '\uD83D\uD83D';
            expect(utf8ByteLength(twoHighSurrogates)).toBe(6);
        });
    });
});
