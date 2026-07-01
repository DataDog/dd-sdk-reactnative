/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const SHIFT_AMOUNTS = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

const K = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0
);

export function md5(input: string): string {
    const bytes = utf8Bytes(input);
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) {
        bytes.push(0);
    }
    for (let index = 0; index < 8; index += 1) {
        bytes.push(Math.floor(bitLength / 2 ** (8 * index)) & 0xff);
    }

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    for (let offset = 0; offset < bytes.length; offset += 64) {
        const words = new Array<number>(16);
        for (let index = 0; index < 16; index += 1) {
            const wordOffset = offset + index * 4;
            words[index] =
                bytes[wordOffset] |
                (bytes[wordOffset + 1] << 8) |
                (bytes[wordOffset + 2] << 16) |
                (bytes[wordOffset + 3] << 24);
        }

        let a = a0;
        let b = b0;
        let c = c0;
        let d = d0;

        for (let index = 0; index < 64; index += 1) {
            let f: number;
            let g: number;
            if (index < 16) {
                f = (b & c) | (~b & d);
                g = index;
            } else if (index < 32) {
                f = (d & b) | (~d & c);
                g = (5 * index + 1) % 16;
            } else if (index < 48) {
                f = b ^ c ^ d;
                g = (3 * index + 5) % 16;
            } else {
                f = c ^ (b | ~d);
                g = (7 * index) % 16;
            }

            const nextD = d;
            d = c;
            c = b;
            b =
                (b +
                    rotateLeft(
                        (a + f + K[index] + words[g]) | 0,
                        SHIFT_AMOUNTS[index]
                    )) |
                0;
            a = nextD;
        }

        a0 = (a0 + a) | 0;
        b0 = (b0 + b) | 0;
        c0 = (c0 + c) | 0;
        d0 = (d0 + d) | 0;
    }

    return [a0, b0, c0, d0].map(wordToHex).join('');
}

function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
}

function wordToHex(word: number): string {
    let output = '';
    for (let index = 0; index < 4; index += 1) {
        output += ((word >>> (index * 8)) & 0xff)
            .toString(16)
            .padStart(2, '0');
    }
    return output;
}

function utf8Bytes(input: string): number[] {
    const bytes: number[] = [];
    for (let index = 0; index < input.length; index += 1) {
        let codePoint = input.charCodeAt(index);
        if (
            codePoint >= 0xd800 &&
            codePoint <= 0xdbff &&
            index + 1 < input.length
        ) {
            const next = input.charCodeAt(index + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                codePoint =
                    0x10000 +
                    ((codePoint - 0xd800) << 10) +
                    (next - 0xdc00);
                index += 1;
            }
        }

        if (codePoint < 0x80) {
            bytes.push(codePoint);
        } else if (codePoint < 0x800) {
            bytes.push(0xc0 | (codePoint >> 6));
            bytes.push(0x80 | (codePoint & 0x3f));
        } else if (codePoint < 0x10000) {
            bytes.push(0xe0 | (codePoint >> 12));
            bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
            bytes.push(0x80 | (codePoint & 0x3f));
        } else {
            bytes.push(0xf0 | (codePoint >> 18));
            bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
            bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
            bytes.push(0x80 | (codePoint & 0x3f));
        }
    }
    return bytes;
}
