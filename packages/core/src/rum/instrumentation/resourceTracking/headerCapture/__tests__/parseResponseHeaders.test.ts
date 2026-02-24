/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { parseResponseHeaders } from '../parseResponseHeaders';

describe('parseResponseHeaders', () => {
    it('parses standard CRLF-delimited headers', () => {
        const raw = 'content-type: text/html\r\ncache-control: no-cache\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html',
            'cache-control': 'no-cache'
        });
    });

    it('returns empty object for null input', () => {
        expect(parseResponseHeaders(null)).toEqual({});
    });

    it('returns empty object for undefined input', () => {
        expect(parseResponseHeaders(undefined)).toEqual({});
    });

    it('returns empty object for empty string input', () => {
        expect(parseResponseHeaders('')).toEqual({});
    });

    it('uses last-value-wins for duplicate header names', () => {
        const raw = 'set-cookie: a=1\r\nset-cookie: b=2\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'set-cookie': 'b=2'
        });
    });

    it('normalizes header names to lowercase', () => {
        const raw = 'Content-Type: text/html\r\nCache-Control: no-cache\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html',
            'cache-control': 'no-cache'
        });
    });

    it('trims whitespace from header values (HTTP OWS)', () => {
        const raw = 'content-type:  text/html  \r\ncache-control:no-cache\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html',
            'cache-control': 'no-cache'
        });
    });

    it('skips malformed lines with no colon', () => {
        const raw =
            'content-type: text/html\r\ngarbage line\r\ncache-control: no-cache\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html',
            'cache-control': 'no-cache'
        });
    });

    it('skips lines where colon is the first character (empty name)', () => {
        const raw = ': some-value\r\ncontent-type: text/html\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html'
        });
    });

    it('handles bare LF without CR (robustness)', () => {
        const raw = 'content-type: text/html\ncache-control: no-cache\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html',
            'cache-control': 'no-cache'
        });
    });

    it('preserves colons in header values (only first colon is separator)', () => {
        const raw = 'location: https://example.com:8080/path\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            location: 'https://example.com:8080/path'
        });
    });

    it('handles empty header values', () => {
        const raw = 'x-custom: \r\ncontent-type: text/html\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'x-custom': '',
            'content-type': 'text/html'
        });
    });

    it('does not produce empty key from trailing CRLF', () => {
        const raw = 'content-type: text/html\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html'
        });
    });

    it('trims whitespace from header names before lowercasing', () => {
        const raw = '  Content-Type  : text/html\r\n';
        expect(parseResponseHeaders(raw)).toEqual({
            'content-type': 'text/html'
        });
    });
});
