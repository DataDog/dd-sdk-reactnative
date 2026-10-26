/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../config/types/SdkVerbosity';
import {
    DEFAULT_REQUEST_HEADERS,
    DEFAULT_RESPONSE_HEADERS,
    CANONICAL_REQUEST_HEADERS,
    CANONICAL_RESPONSE_HEADERS
} from '../captureHeaders';
import { compileHeaderCaptureConfig } from '../compileHeaderConfig';
import { normalizeUrlForMatching } from '../normalizeUrlForMatching';

jest.mock('../../../../../InternalLog', () => ({
    InternalLog: {
        log: jest.fn()
    }
}));

const mockLog = InternalLog.log as jest.Mock;

beforeEach(() => {
    mockLog.mockClear();
});

describe('compileHeaderCaptureConfig', () => {
    describe('disabled / null output', () => {
        it('returns null for undefined', () => {
            expect(compileHeaderCaptureConfig(undefined)).toBeNull();
        });

        it('returns null for empty array and logs WARN', () => {
            const result = compileHeaderCaptureConfig([]);
            expect(result).toBeNull();
            expect(mockLog).toHaveBeenCalledWith(
                expect.stringContaining(
                    'headerCaptureRules is empty, no headers will be captured'
                ),
                SdkVerbosity.WARN
            );
        });

        it('returns null for totally invalid value and logs WARN', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = compileHeaderCaptureConfig(
                'totally-invalid-value' as any
            );
            expect(result).toBeNull();
            expect(mockLog).toHaveBeenCalledWith(
                expect.any(String),
                SdkVerbosity.WARN
            );
        });
    });

    describe('"defaults" string shortcut', () => {
        it('returns an array with exactly 1 rule', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
        });

        it('has requestHeaderNames equal to DEFAULT_REQUEST_HEADERS', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            expect(result?.[0].requestHeaderNames).toEqual(
                new Set(DEFAULT_REQUEST_HEADERS)
            );
        });

        it('has responseHeaderNames equal to DEFAULT_RESPONSE_HEADERS', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            expect(result?.[0].responseHeaderNames).toEqual(
                new Set(DEFAULT_RESPONSE_HEADERS)
            );
        });

        it('has urlRegex matching any URL', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            expect(result?.[0].urlRegex.test('https://anything.com/path')).toBe(
                true
            );
        });

        it('has isScoped equal to false', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            expect(result?.[0].isScoped).toBe(false);
        });
    });

    describe('array input — rule variants', () => {
        it('compiles a defaults rule with default header sets', () => {
            const result = compileHeaderCaptureConfig([{ type: 'defaults' }]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderNames).toEqual(
                new Set(DEFAULT_REQUEST_HEADERS)
            );
            expect(rule.responseHeaderNames).toEqual(
                new Set(DEFAULT_RESPONSE_HEADERS)
            );
            expect(rule.urlRegex.test('https://anything.com/path')).toBe(true);
            expect(rule.isScoped).toBe(false);
        });

        it('compiles a matchHeaders rule with both request and response sets', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'matchHeaders', headers: ['Content-Type', 'X-Custom'] }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderNames).toEqual(
                new Set(['content-type', 'x-custom'])
            );
            expect(rule.responseHeaderNames).toEqual(
                new Set(['content-type', 'x-custom'])
            );
        });

        it('compiles a matchRequestHeaders rule with request set only', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchRequestHeaders',
                    headers: ['X-Request-ID', 'Authorization']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderNames).toEqual(
                new Set(['x-request-id', 'authorization'])
            );
            expect(rule.responseHeaderNames).toEqual(new Set());
        });

        it('compiles a matchResponseHeaders rule with response set only', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['ETag', 'X-RateLimit-Remaining']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderNames).toEqual(new Set());
            expect(rule.responseHeaderNames).toEqual(
                new Set(['etag', 'x-ratelimit-remaining'])
            );
        });

        it('lowercases header names regardless of input casing', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchHeaders',
                    headers: ['X-Request-ID', 'AUTHORIZATION', 'Cache-Control']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result?.[0].requestHeaderNames).toEqual(
                new Set(['x-request-id', 'authorization', 'cache-control'])
            );
            expect(result?.[0].responseHeaderNames).toEqual(
                new Set(['x-request-id', 'authorization', 'cache-control'])
            );
        });

        it('{ type: "defaults" } in array produces rule with isScoped: false', () => {
            const result = compileHeaderCaptureConfig([{ type: 'defaults' }]);
            expect(result).not.toBeNull();
            expect(result?.[0].isScoped).toBe(false);
        });

        it('matchHeaders with specific forURLs produces rule with isScoped: true', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result?.[0].isScoped).toBe(true);
        });
    });

    describe('forURLs handling', () => {
        it('omitting forURLs produces catch-all regex and isScoped: false', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'matchResponseHeaders', headers: ['etag'] }
            ]);
            expect(result).not.toBeNull();
            const { urlRegex, isScoped } = (result ?? [])[0];
            expect(urlRegex.test('https://anything.com/path')).toBe(true);
            expect(urlRegex.test('http://other.io')).toBe(true);
            expect(isScoped).toBe(false);
        });

        it('forURLs: ["*"] produces catch-all regex and isScoped: false', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['*']
                }
            ]);
            expect(result).not.toBeNull();
            const { urlRegex, isScoped } = (result ?? [])[0];
            expect(urlRegex.test('https://anything.com/path')).toBe(true);
            expect(urlRegex.test('')).toBe(true);
            expect(isScoped).toBe(false);
        });

        it('forURLs containing "*" alongside other patterns is catch-all', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchHeaders',
                    headers: ['x-foo'],
                    forURLs: ['*', 'api.example.com']
                }
            ]);
            const { urlRegex, isScoped } = (result ?? [])[0];
            expect(isScoped).toBe(false);
            expect(urlRegex.test('https://other.com/path')).toBe(true);
        });

        it('specific forURLs patterns produce isScoped: true', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com']
                }
            ]);
            expect(result).not.toBeNull();
            const { urlRegex, isScoped } = (result ?? [])[0];
            expect(urlRegex.test('https://api.example.com/any')).toBe(true);
            expect(urlRegex.test('https://api.example.com')).toBe(true);
            expect(urlRegex.test('https://other.com/api')).toBe(false);
            // Dots in the hostname are escaped (literal), not wildcards
            expect(urlRegex.test('https://apiXexampleYcom/any')).toBe(false);
            expect(isScoped).toBe(true);
        });

        it('forURLs: ["api.example.com/v2"] matches /v2 paths but not /v1', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com/v2']
                }
            ]);
            expect(result).not.toBeNull();
            const { urlRegex } = (result ?? [])[0];
            expect(urlRegex.test('https://api.example.com/v2/users')).toBe(
                true
            );
            expect(urlRegex.test('https://api.example.com/v1/users')).toBe(
                false
            );
            // Dots in hostname and path are escaped (literal), not wildcards
            expect(urlRegex.test('https://apiXexampleYcom/v2/users')).toBe(
                false
            );
        });

        it('forURLs path prefix ends on a path segment boundary', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com/v2']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            expect(urlRegex.test('https://api.example.com/v2')).toBe(true);
            expect(urlRegex.test('https://api.example.com/v2?page=1')).toBe(
                true
            );
            expect(urlRegex.test('https://api.example.com/v2#top')).toBe(true);
            expect(urlRegex.test('https://api.example.com/v22/users')).toBe(
                false
            );
            expect(urlRegex.test('https://api.example.com/v2-beta')).toBe(
                false
            );
        });

        it('forURLs matches URLs with userinfo on the configured host', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com/v2']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            expect(
                urlRegex.test('https://user:pass@api.example.com/v2/users')
            ).toBe(true);
            expect(urlRegex.test('https://user@cdn.api.example.com/v2')).toBe(
                true
            );
            expect(
                urlRegex.test('https://user:pass@api.example.com/v1/users')
            ).toBe(false);
        });

        it('forURLs path scope applies to the resolved path', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com/public']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            const matches = (url: string) =>
                urlRegex.test(normalizeUrlForMatching(url));

            expect(matches('https://api.example.com/public/../private')).toBe(
                false
            );
            expect(
                matches('https://api.example.com/public/%2e%2e/private')
            ).toBe(false);
            expect(matches('https://api.example.com/other/../public/x')).toBe(
                true
            );
        });

        it('forURLs matches the host case-insensitively and the path case-sensitively', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['API.Example.com/Public']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            const matches = (url: string) =>
                urlRegex.test(normalizeUrlForMatching(url));

            expect(matches('https://api.example.com/Public/users')).toBe(true);
            expect(matches('HTTPS://API.EXAMPLE.COM/Public/users')).toBe(true);
            expect(matches('https://api.example.com/public/users')).toBe(false);
            expect(matches('https://api.example.com/PUBLIC/users')).toBe(false);
        });

        it('forURLs path prefix ending with a slash matches nested paths', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com/v2/']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            expect(urlRegex.test('https://api.example.com/v2/users')).toBe(
                true
            );
            expect(urlRegex.test('https://api.example.com/v2')).toBe(false);
        });

        it('forURLs matches subdomains but not hostnames in the path, query or userinfo', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com']
                }
            ]);
            const { urlRegex } = (result ?? [])[0];
            expect(urlRegex.test('https://cdn.api.example.com/users')).toBe(
                true
            );
            expect(urlRegex.test('https://a.b.api.example.com:8443/x')).toBe(
                true
            );
            expect(
                urlRegex.test(
                    'https://unrelated.test/assets.api.example.com/users'
                )
            ).toBe(false);
            expect(
                urlRegex.test(
                    'https://unrelated.test/?next=cdn.api.example.com/users'
                )
            ).toBe(false);
            expect(
                urlRegex.test('https://unrelated.test#x.api.example.com')
            ).toBe(false);
            expect(
                urlRegex.test('https://user.api.example.com@unrelated.test/')
            ).toBe(false);
            expect(urlRegex.test('https://api.example.com.evil.test/')).toBe(
                false
            );
            expect(urlRegex.test('https://notapi.example.com/')).toBe(false);
            expect(
                urlRegex.test('https://api.example.com@unrelated.test/users')
            ).toBe(false);
            expect(
                urlRegex.test(
                    'https://user:pass@unrelated.test/api.example.com'
                )
            ).toBe(false);
            // URL parsers treat '\\' as '/', so this request goes to unrelated.test
            expect(
                urlRegex.test('https://unrelated.test\\.api.example.com/users')
            ).toBe(false);
        });

        it('forURLs: [] (empty) skips the rule with WARN log', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: []
                }
            ]);
            // With only one rule that gets skipped, all rules fail -> null
            expect(result).toBeNull();
            expect(mockLog).toHaveBeenCalledWith(
                expect.stringContaining('empty forURLs'),
                SdkVerbosity.WARN
            );
        });

        it('forURLs with special regex characters treats them as literal hostname characters', () => {
            // Metacharacters like '[' are escaped by escapeRegExp so they become literal matches
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['[special].example.com']
                }
            ]);
            expect(result).not.toBeNull();
            const rule0 = (result ?? [])[0];
            expect(rule0.isScoped).toBe(true);
            // The pattern is treated literally: it matches the host '[special].example.com'
            expect(
                rule0.urlRegex.test('https://[special].example.com/path')
            ).toBe(true);
            // It does NOT match hosts that would match the unescaped regex interpretation
            expect(
                rule0.urlRegex.test('https://xspecialx.example.com/path')
            ).toBe(false);
        });

        it('forURLs with multiple patterns produces combined regex', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: ['api.example.com', 'cdn.example.com']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            const { urlRegex } = (result ?? [])[0];
            expect(urlRegex.test('https://api.example.com/v2')).toBe(true);
            expect(urlRegex.test('https://cdn.example.com/assets')).toBe(true);
            expect(urlRegex.test('https://other.com')).toBe(false);
            // Dots in hostnames are escaped (literal), not wildcards
            expect(urlRegex.test('https://apiXexampleYcom/v2')).toBe(false);
            expect(urlRegex.test('https://cdnXexampleYcom/assets')).toBe(false);
        });
    });

    describe('multiple rules', () => {
        it('compiles multiple rules of different types', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'defaults' },
                {
                    type: 'matchHeaders',
                    headers: ['X-Custom'],
                    forURLs: ['api.example.com']
                },
                { type: 'matchRequestHeaders', headers: ['Authorization'] },
                { type: 'matchResponseHeaders', headers: ['ETag'] }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(4);
        });

        it('keeps valid rules and skips invalid ones', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'matchResponseHeaders', headers: ['etag'] },
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: []
                } // skipped
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(1);
            expect(mockLog).toHaveBeenCalledTimes(1);
        });
    });

    describe('malformed rules', () => {
        it.each([
            ['null', null],
            ['a string', 'defaults'],
            ['a rule without type', { headers: ['etag'] }],
            ['a rule with an unknown type', { type: 'all', headers: ['etag'] }],
            ['a match rule without headers', { type: 'matchHeaders' }],
            [
                'a match rule with non-string headers',
                { type: 'matchRequestHeaders', headers: ['etag', 42] }
            ],
            [
                'a rule with null forURLs',
                {
                    type: 'matchResponseHeaders',
                    headers: ['etag'],
                    forURLs: null
                }
            ],
            [
                'a rule with non-array forURLs',
                { type: 'defaults', forURLs: 'api.example.com' }
            ],
            ['a rule with a non-string type', { type: ['defaults'] }],
            [
                'a rule whose type cannot be converted to a string',
                { type: { toString: null } }
            ]
        ])('skips %s with a WARN log instead of throwing', (_, rule) => {
            const result = compileHeaderCaptureConfig([
                rule,
                { type: 'matchResponseHeaders', headers: ['etag'] }
            ] as any);

            expect(result).toHaveLength(1);
            expect(result?.[0].responseHeaderNames).toEqual(new Set(['etag']));
            expect(mockLog).toHaveBeenCalledWith(
                expect.stringContaining('Skipping invalid rule'),
                SdkVerbosity.WARN
            );
        });

        it('returns null when every rule is malformed', () => {
            expect(
                compileHeaderCaptureConfig([
                    null,
                    { type: 'matchHeaders' }
                ] as any)
            ).toBeNull();
        });
    });

    describe('casing maps', () => {
        it('"defaults" shortcut produces canonical casing maps', () => {
            const result = compileHeaderCaptureConfig('defaults');
            expect(result).not.toBeNull();
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderCasing).toEqual(
                new Map(CANONICAL_REQUEST_HEADERS)
            );
            expect(rule.responseHeaderCasing).toEqual(
                new Map(CANONICAL_RESPONSE_HEADERS)
            );
        });

        it('{ type: "defaults" } rule produces canonical casing maps', () => {
            const result = compileHeaderCaptureConfig([{ type: 'defaults' }]);
            expect(result).not.toBeNull();
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderCasing).toEqual(
                new Map(CANONICAL_REQUEST_HEADERS)
            );
            expect(rule.responseHeaderCasing).toEqual(
                new Map(CANONICAL_RESPONSE_HEADERS)
            );
        });

        it('matchHeaders preserves user casing in both maps', () => {
            const result = compileHeaderCaptureConfig([
                {
                    type: 'matchHeaders',
                    headers: ['Content-Type', 'X-Custom']
                }
            ]);
            expect(result).not.toBeNull();
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderCasing).toEqual(
                new Map([
                    ['content-type', 'Content-Type'],
                    ['x-custom', 'X-Custom']
                ])
            );
            expect(rule.responseHeaderCasing).toEqual(
                new Map([
                    ['content-type', 'Content-Type'],
                    ['x-custom', 'X-Custom']
                ])
            );
        });

        it('matchRequestHeaders populates requestHeaderCasing only', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'matchRequestHeaders', headers: ['X-Api-Key'] }
            ]);
            expect(result).not.toBeNull();
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderCasing).toEqual(
                new Map([['x-api-key', 'X-Api-Key']])
            );
            expect(rule.responseHeaderCasing).toEqual(new Map());
        });

        it('matchResponseHeaders populates responseHeaderCasing only', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'matchResponseHeaders', headers: ['X-RateLimit'] }
            ]);
            expect(result).not.toBeNull();
            const rule = (result ?? [])[0];
            expect(rule.requestHeaderCasing).toEqual(new Map());
            expect(rule.responseHeaderCasing).toEqual(
                new Map([['x-ratelimit', 'X-RateLimit']])
            );
        });

        it('each rule carries its own casing map independently', () => {
            const result = compileHeaderCaptureConfig([
                { type: 'defaults' },
                {
                    type: 'matchResponseHeaders',
                    headers: ['content-type']
                }
            ]);
            expect(result).not.toBeNull();
            expect(result).toHaveLength(2);

            // Defaults rule has canonical Title-Case
            expect(result?.[0].responseHeaderCasing.get('content-type')).toBe(
                'Content-Type'
            );

            // Custom rule preserves user-provided lowercase
            expect(result?.[1].responseHeaderCasing.get('content-type')).toBe(
                'content-type'
            );
        });
    });
});
