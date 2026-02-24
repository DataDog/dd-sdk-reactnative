/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    DEFAULT_RESPONSE_HEADERS,
    DEFAULT_REQUEST_HEADERS,
    CANONICAL_RESPONSE_HEADERS,
    CANONICAL_REQUEST_HEADERS,
    accumulateRequestHeader,
    captureResponseHeaders,
    filterRequestHeadersByMode
} from '../captureHeaders';
import type { CompiledHeaderCaptureConfig } from '../types';

describe('captureHeaders', () => {
    describe('DEFAULT_RESPONSE_HEADERS', () => {
        it('contains exactly 10 header names', () => {
            expect(DEFAULT_RESPONSE_HEADERS.size).toBe(10);
        });

        it.each([
            'cache-control',
            'etag',
            'age',
            'expires',
            'content-type',
            'content-encoding',
            'content-length',
            'vary',
            'server-timing',
            'x-cache'
        ])('contains %s', header => {
            expect(DEFAULT_RESPONSE_HEADERS.has(header)).toBe(true);
        });
    });

    describe('DEFAULT_REQUEST_HEADERS', () => {
        it('contains exactly 2 header names', () => {
            expect(DEFAULT_REQUEST_HEADERS.size).toBe(2);
        });

        it.each(['cache-control', 'content-type'])('contains %s', header => {
            expect(DEFAULT_REQUEST_HEADERS.has(header)).toBe(true);
        });
    });

    describe('accumulateRequestHeader', () => {
        it('stores an allowed header with original casing', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'Content-Type', 'application/json');
            expect(acc).toEqual({ 'Content-Type': 'application/json' });
        });

        it('blocks sensitive headers (authorization)', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'Authorization', 'Bearer xyz');
            expect(acc).toEqual({});
        });

        it('blocks tracing headers (x-datadog-trace-id)', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'x-datadog-trace-id', '123');
            expect(acc).toEqual({});
        });

        it('uses last-value-wins for duplicate header names', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'Content-Type', 'application/json');
            accumulateRequestHeader(acc, 'Content-Type', 'text/html');
            expect(acc).toEqual({ 'Content-Type': 'text/html' });
        });

        it('preserves custom header casing', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'X-Custom', 'val');
            expect(acc).toEqual({ 'X-Custom': 'val' });
        });

        it('accumulates multiple allowed headers', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'Content-Type', 'application/json');
            accumulateRequestHeader(acc, 'Accept', 'text/html');
            expect(acc).toEqual({
                'Content-Type': 'application/json',
                Accept: 'text/html'
            });
        });

        it('preserves original setRequestHeader casing in accumulator key', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'Content-Type', 'application/json');
            expect(acc).toEqual({ 'Content-Type': 'application/json' });
        });

        it('preserves mixed-case custom header name', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'X-Request-ID', 'abc');
            expect(acc).toEqual({ 'X-Request-ID': 'abc' });
        });

        it('last-value-wins preserves latest casing', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'content-type', 'first');
            accumulateRequestHeader(acc, 'Content-Type', 'second');
            expect(acc).toEqual({ 'Content-Type': 'second' });
            expect(Object.keys(acc)).toEqual(['Content-Type']);
        });

        it('still blocks sensitive headers regardless of casing', () => {
            const acc: Record<string, string> = {};
            accumulateRequestHeader(acc, 'AUTHORIZATION', 'Bearer xyz');
            expect(acc).toEqual({});

            accumulateRequestHeader(acc, 'Authorization', 'Bearer xyz');
            expect(acc).toEqual({});
        });
    });

    describe('captureResponseHeaders', () => {
        const defaultsConfig: CompiledHeaderCaptureConfig = [
            {
                urlRegex: /.*/,
                requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                isScoped: false,
                requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
            }
        ];
        const disabledConfig: CompiledHeaderCaptureConfig = null;
        const testUrl = 'https://api.example.com/data';

        it('returns undefined when config is null (disabled)', () => {
            const result = captureResponseHeaders(
                'content-type: text/html\r\n',
                testUrl,
                disabledConfig
            );
            expect(result).toBeUndefined();
        });

        it('returns undefined when rawHeaders is null', () => {
            const result = captureResponseHeaders(
                null,
                testUrl,
                defaultsConfig
            );
            expect(result).toBeUndefined();
        });

        it('returns undefined when rawHeaders is undefined', () => {
            const result = captureResponseHeaders(
                undefined,
                testUrl,
                defaultsConfig
            );
            expect(result).toBeUndefined();
        });

        it('returns undefined when rawHeaders is empty string', () => {
            const result = captureResponseHeaders('', testUrl, defaultsConfig);
            expect(result).toBeUndefined();
        });

        it('captures default response headers with defaults rule', () => {
            const raw =
                'content-type: text/html\r\ncache-control: no-cache\r\n';
            const result = captureResponseHeaders(raw, testUrl, defaultsConfig);
            expect(result).toEqual({
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            });
        });

        it('filters out non-default headers with defaults rule', () => {
            const raw = 'x-custom: val\r\n';
            const result = captureResponseHeaders(raw, testUrl, defaultsConfig);
            expect(result).toBeUndefined();
        });

        it('filters out sensitive headers via security filter', () => {
            const raw = 'authorization: secret\r\ncache-control: no-cache\r\n';
            const result = captureResponseHeaders(raw, testUrl, defaultsConfig);
            expect(result).toEqual({ 'Cache-Control': 'no-cache' });
        });

        it('returns undefined when all headers are sensitive', () => {
            const raw = 'authorization: secret\r\ncookie: session=abc\r\n';
            const result = captureResponseHeaders(raw, testUrl, defaultsConfig);
            expect(result).toBeUndefined();
        });

        it('captures all 10 default response headers when present', () => {
            const raw = `${[
                'cache-control: max-age=3600',
                'etag: "abc123"',
                'age: 100',
                'expires: Thu, 01 Jan 2099 00:00:00 GMT',
                'content-type: application/json',
                'content-encoding: gzip',
                'content-length: 1234',
                'vary: Accept-Encoding',
                'server-timing: db;dur=53',
                'x-cache: HIT'
            ].join('\r\n')}\r\n`;
            const result = captureResponseHeaders(raw, testUrl, defaultsConfig);
            expect(result).toEqual({
                'Cache-Control': 'max-age=3600',
                ETag: '"abc123"',
                Age: '100',
                Expires: 'Thu, 01 Jan 2099 00:00:00 GMT',
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip',
                'Content-Length': '1234',
                Vary: 'Accept-Encoding',
                'Server-Timing': 'db;dur=53',
                'X-Cache': 'HIT'
            });
        });

        describe('scoped rules', () => {
            it('captures only headers from matching rule', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/api\.example\.com/,
                        requestHeaderNames: new Set(['x-request-id']),
                        responseHeaderNames: new Set([
                            'x-custom',
                            'content-type'
                        ]),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-request-id', 'x-request-id']
                        ]),
                        responseHeaderCasing: new Map([
                            ['x-custom', 'x-custom'],
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw =
                    'x-custom: val\r\ncontent-type: text/html\r\ncache-control: no-cache\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({
                    'x-custom': 'val',
                    'content-type': 'text/html'
                });
            });

            it('returns undefined when no rule matches the URL', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/other\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw = 'content-type: text/html\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toBeUndefined();
            });

            it('still applies security filter with scoped rules', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set([
                            'authorization',
                            'content-type'
                        ]),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['authorization', 'authorization'],
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw =
                    'authorization: secret\r\ncontent-type: text/html\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({ 'content-type': 'text/html' });
            });
        });

        describe('union merging', () => {
            it('merges headers from multiple matching rules additively', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['x-cache']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([['x-cache', 'x-cache']])
                    },
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw = 'x-cache: HIT\r\ncontent-type: text/html\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({
                    'x-cache': 'HIT',
                    'content-type': 'text/html'
                });
            });

            it('scoped rules replace catch-all rules when both match', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['etag']),
                        isScoped: false,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([['etag', 'etag']])
                    },
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['x-cache']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([['x-cache', 'x-cache']])
                    }
                ];
                const raw = 'etag: "abc"\r\nx-cache: HIT\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({ 'x-cache': 'HIT' });
            });

            it('catch-all rules apply when no scoped rule matches', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['etag']),
                        isScoped: false,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([['etag', 'etag']])
                    },
                    {
                        urlRegex: /other\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['x-cache']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([['x-cache', 'x-cache']])
                    }
                ];
                const raw = 'etag: "abc"\r\nx-cache: HIT\r\n';
                const result = captureResponseHeaders(
                    raw,
                    'https://api.example.com/data',
                    config
                );
                expect(result).toEqual({ etag: '"abc"' });
            });

            it('multiple scoped rules merge additively', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['x-cache', 'vary']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['x-cache', 'x-cache'],
                            ['vary', 'vary']
                        ])
                    },
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type', 'etag']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'content-type'],
                            ['etag', 'etag']
                        ])
                    }
                ];
                const raw =
                    'x-cache: HIT\r\nvary: Accept\r\ncontent-type: text/html\r\netag: "abc"\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({
                    'x-cache': 'HIT',
                    vary: 'Accept',
                    'content-type': 'text/html',
                    etag: '"abc"'
                });
            });
        });

        describe('casing preservation', () => {
            it('outputs default headers with canonical Title-Case casing', () => {
                const raw =
                    'content-type: text/html\r\ncache-control: no-cache\r\n';
                const result = captureResponseHeaders(
                    raw,
                    testUrl,
                    defaultsConfig
                );
                expect(result).toEqual({
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                });
            });

            it('outputs custom rule headers with user-provided casing', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['x-ratelimit']),
                        isScoped: false,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['x-ratelimit', 'x-ratelimit']
                        ])
                    }
                ];
                const raw = 'x-ratelimit: 100\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                expect(result).toEqual({ 'x-ratelimit': '100' });
            });

            it('custom rule casing overrides defaults for same header', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                        responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                        isScoped: false,
                        requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                        responseHeaderCasing: new Map(
                            CANONICAL_RESPONSE_HEADERS
                        )
                    },
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type']),
                        isScoped: false,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw = 'content-type: text/html\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                // Second rule's casing should override first for same header
                expect(result).toEqual({ 'content-type': 'text/html' });
            });

            it('first custom rule casing wins among custom rules', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'Content-Type']
                        ])
                    },
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(),
                        responseHeaderNames: new Set(['content-type']),
                        isScoped: true,
                        requestHeaderCasing: new Map(),
                        responseHeaderCasing: new Map([
                            ['content-type', 'content-type']
                        ])
                    }
                ];
                const raw = 'content-type: text/html\r\n';
                const result = captureResponseHeaders(raw, testUrl, config);
                // First rule's casing wins
                expect(result).toEqual({ 'Content-Type': 'text/html' });
            });
        });
    });

    describe('filterRequestHeadersByMode', () => {
        const testUrl = 'https://api.example.com/data';
        const disabledConfig: CompiledHeaderCaptureConfig = null;
        const defaultsConfig: CompiledHeaderCaptureConfig = [
            {
                urlRegex: /.*/,
                requestHeaderNames: new Set(DEFAULT_REQUEST_HEADERS),
                responseHeaderNames: new Set(DEFAULT_RESPONSE_HEADERS),
                isScoped: false,
                requestHeaderCasing: new Map(CANONICAL_REQUEST_HEADERS),
                responseHeaderCasing: new Map(CANONICAL_RESPONSE_HEADERS)
            }
        ];

        it('returns undefined when config is null (disabled)', () => {
            const result = filterRequestHeadersByMode(
                { 'content-type': 'json' },
                testUrl,
                disabledConfig
            );
            expect(result).toBeUndefined();
        });

        it('keeps only default request headers with defaults rule', () => {
            const result = filterRequestHeadersByMode(
                { 'content-type': 'json', 'x-custom': 'val' },
                testUrl,
                defaultsConfig
            );
            expect(result).toEqual({ 'Content-Type': 'json' });
        });

        it('returns undefined when no default request headers present', () => {
            const result = filterRequestHeadersByMode(
                { 'x-custom': 'val' },
                testUrl,
                defaultsConfig
            );
            expect(result).toBeUndefined();
        });

        it('keeps both default request headers when present', () => {
            const result = filterRequestHeadersByMode(
                {
                    'content-type': 'json',
                    'cache-control': 'no-cache',
                    'x-custom': 'val'
                },
                testUrl,
                defaultsConfig
            );
            expect(result).toEqual({
                'Content-Type': 'json',
                'Cache-Control': 'no-cache'
            });
        });

        describe('scoped rules', () => {
            it('keeps only request headers from matching rule', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/api\.example\.com/,
                        requestHeaderNames: new Set(['x-request-id']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-request-id', 'x-request-id']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                const result = filterRequestHeadersByMode(
                    { 'x-request-id': 'abc', 'x-other': 'def' },
                    testUrl,
                    config
                );
                expect(result).toEqual({ 'x-request-id': 'abc' });
            });

            it('returns undefined when no rule matches URL', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/other\.example\.com/,
                        requestHeaderNames: new Set(['x-request-id']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-request-id', 'x-request-id']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                const result = filterRequestHeadersByMode(
                    { 'x-request-id': 'abc' },
                    testUrl,
                    config
                );
                expect(result).toBeUndefined();
            });

            it('returns undefined when matching rule has no request header matches', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /^https?:\/\/api\.example\.com/,
                        requestHeaderNames: new Set(['x-request-id']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-request-id', 'x-request-id']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                const result = filterRequestHeadersByMode(
                    { 'x-other': 'val' },
                    testUrl,
                    config
                );
                expect(result).toBeUndefined();
            });
        });

        describe('union merging', () => {
            it('merges request headers from multiple matching rules', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(['x-request-id']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-request-id', 'x-request-id']
                        ]),
                        responseHeaderCasing: new Map()
                    },
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(['content-type']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['content-type', 'content-type']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                const result = filterRequestHeadersByMode(
                    {
                        'x-request-id': 'abc',
                        'content-type': 'json',
                        'x-other': 'val'
                    },
                    testUrl,
                    config
                );
                expect(result).toEqual({
                    'x-request-id': 'abc',
                    'content-type': 'json'
                });
            });

            it('scoped rules replace catch-all for request headers', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set(['x-catch-all']),
                        responseHeaderNames: new Set(),
                        isScoped: false,
                        requestHeaderCasing: new Map([
                            ['x-catch-all', 'x-catch-all']
                        ]),
                        responseHeaderCasing: new Map()
                    },
                    {
                        urlRegex: /api\.example\.com/,
                        requestHeaderNames: new Set(['x-scoped']),
                        responseHeaderNames: new Set(),
                        isScoped: true,
                        requestHeaderCasing: new Map([
                            ['x-scoped', 'x-scoped']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                const result = filterRequestHeadersByMode(
                    { 'x-catch-all': 'a', 'x-scoped': 'b' },
                    testUrl,
                    config
                );
                expect(result).toEqual({ 'x-scoped': 'b' });
            });
        });

        it('returns undefined for empty accumulated headers', () => {
            const result = filterRequestHeadersByMode(
                {},
                testUrl,
                defaultsConfig
            );
            expect(result).toBeUndefined();
        });

        describe('casing preservation', () => {
            it('outputs request headers with original accumulated casing', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set([
                            'content-type',
                            'x-request-id'
                        ]),
                        responseHeaderNames: new Set(),
                        isScoped: false,
                        requestHeaderCasing: new Map([
                            ['content-type', 'Content-Type'],
                            ['x-request-id', 'X-Request-ID']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                // Accumulated headers have original setRequestHeader casing
                const result = filterRequestHeadersByMode(
                    {
                        'Content-Type': 'application/json',
                        'X-Request-ID': 'abc'
                    },
                    testUrl,
                    config
                );
                expect(result).toEqual({
                    'Content-Type': 'application/json',
                    'X-Request-ID': 'abc'
                });
            });

            it('falls back to config casing when accumulated key is lowered', () => {
                const config: CompiledHeaderCaptureConfig = [
                    {
                        urlRegex: /.*/,
                        requestHeaderNames: new Set([
                            'content-type',
                            'cache-control'
                        ]),
                        responseHeaderNames: new Set(),
                        isScoped: false,
                        requestHeaderCasing: new Map([
                            ['content-type', 'Content-Type'],
                            ['cache-control', 'Cache-Control']
                        ]),
                        responseHeaderCasing: new Map()
                    }
                ];
                // Accumulated headers are lowered (legacy/fallback scenario)
                const result = filterRequestHeadersByMode(
                    {
                        'content-type': 'application/json',
                        'cache-control': 'no-cache'
                    },
                    testUrl,
                    config
                );
                expect(result).toEqual({
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                });
            });
        });
    });
});
