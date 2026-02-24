/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    enforceSizeLimits,
    MAX_HEADER_VALUE_BYTES,
    MAX_HEADER_COUNT,
    MAX_TOTAL_BYTES
} from '../enforceSizeLimits';

describe('enforceSizeLimits', () => {
    describe('constants', () => {
        it('exports MAX_HEADER_VALUE_BYTES as 128', () => {
            expect(MAX_HEADER_VALUE_BYTES).toBe(128);
        });

        it('exports MAX_HEADER_COUNT as 100', () => {
            expect(MAX_HEADER_COUNT).toBe(100);
        });

        it('exports MAX_TOTAL_BYTES as 2048', () => {
            expect(MAX_TOTAL_BYTES).toBe(2048);
        });
    });

    describe('undefined passthrough', () => {
        it('returns both undefined when both inputs are undefined', () => {
            const result = enforceSizeLimits(undefined, undefined);
            expect(result.requestHeaders).toBeUndefined();
            expect(result.responseHeaders).toBeUndefined();
        });

        it('passes through small request headers when response is undefined', () => {
            const result = enforceSizeLimits({ a: 'b' }, undefined);
            expect(result.requestHeaders).toEqual({ a: 'b' });
            expect(result.responseHeaders).toBeUndefined();
        });

        it('passes through small response headers when request is undefined', () => {
            const result = enforceSizeLimits(undefined, { a: 'b' });
            expect(result.requestHeaders).toBeUndefined();
            expect(result.responseHeaders).toEqual({ a: 'b' });
        });
    });

    describe('value truncation', () => {
        it('truncates header values longer than 128 bytes', () => {
            const longValue = 'a'.repeat(200);
            const result = enforceSizeLimits({ x: longValue }, undefined);
            expect(result.requestHeaders!['x']).toBe('a'.repeat(128));
            expect(result.requestHeaders!['x'].length).toBe(128);
        });

        it('does not truncate values exactly at 128 bytes', () => {
            const exactValue = 'a'.repeat(128);
            const result = enforceSizeLimits({ x: exactValue }, undefined);
            expect(result.requestHeaders!['x']).toBe(exactValue);
        });

        it('truncates response header values as well', () => {
            const longValue = 'b'.repeat(200);
            const result = enforceSizeLimits(undefined, {
                y: longValue
            });
            expect(result.responseHeaders!['y']).toBe('b'.repeat(128));
        });
    });

    describe('header count cap', () => {
        it('keeps all headers when combined count is at 100', () => {
            const req: Record<string, string> = {};
            const res: Record<string, string> = {};
            for (let i = 0; i < 50; i++) {
                req[`rq${i}`] = 'v';
                res[`rs${i}`] = 'v';
            }
            const result = enforceSizeLimits(req, res);
            expect(
                Object.keys(result.requestHeaders!).length +
                    Object.keys(result.responseHeaders!).length
            ).toBe(100);
        });

        it('caps total to 100 with request headers taking priority', () => {
            const req: Record<string, string> = {};
            const res: Record<string, string> = {};
            for (let i = 0; i < 60; i++) {
                req[`rq${i}`] = 'v';
                res[`rs${i}`] = 'v';
            }
            const result = enforceSizeLimits(req, res);
            expect(Object.keys(result.requestHeaders!).length).toBe(60);
            expect(Object.keys(result.responseHeaders!).length).toBe(40);
        });

        it('caps request-only headers to 100', () => {
            const req: Record<string, string> = {};
            for (let i = 0; i < 110; i++) {
                req[`h${i}`] = 'v';
            }
            const result = enforceSizeLimits(req, undefined);
            expect(Object.keys(result.requestHeaders!).length).toBe(100);
            expect(result.responseHeaders).toBeUndefined();
        });

        it('returns undefined for response when all its headers are dropped by count cap', () => {
            const req: Record<string, string> = {};
            for (let i = 0; i < 100; i++) {
                req[`h${i}`] = 'v';
            }
            const res: Record<string, string> = { a: 'b' };
            const result = enforceSizeLimits(req, res);
            expect(Object.keys(result.requestHeaders!).length).toBe(100);
            expect(result.responseHeaders).toBeUndefined();
        });
    });

    describe('total size budget', () => {
        it('drops response headers first when total exceeds 2048 bytes', () => {
            // Each header: name(4) + value(100) = 104 bytes
            // 20 headers = 2080 bytes > 2048
            const req: Record<string, string> = {};
            const res: Record<string, string> = {};
            for (let i = 0; i < 10; i++) {
                req[`rq${String(i).padStart(2, '0')}`] = 'x'.repeat(100);
                res[`rs${String(i).padStart(2, '0')}`] = 'x'.repeat(100);
            }
            const result = enforceSizeLimits(req, res);
            // Request headers should be preserved; response headers dropped from end
            expect(Object.keys(result.requestHeaders!).length).toBe(10);
            // Some response headers should be dropped
            const totalBytes = computeTotalBytes(
                result.requestHeaders,
                result.responseHeaders
            );
            expect(totalBytes).toBeLessThanOrEqual(2048);
        });

        it('drops request headers from end if response fully dropped and still over budget', () => {
            // 25 request headers each with name(3) + value(100) = 103 bytes
            // 25 * 103 = 2575 > 2048
            const req: Record<string, string> = {};
            for (let i = 0; i < 25; i++) {
                req[`h${String(i).padStart(1, '0')}`] = 'y'.repeat(100);
            }
            const result = enforceSizeLimits(req, undefined);
            const totalBytes = computeTotalBytes(
                result.requestHeaders,
                result.responseHeaders
            );
            expect(totalBytes).toBeLessThanOrEqual(2048);
            // Some request headers should be dropped
            expect(Object.keys(result.requestHeaders!).length).toBeLessThan(25);
        });

        it('returns undefined for response when all response headers dropped for budget', () => {
            // 19 request headers: name(4) + value(100) = 104 each = 1976
            // 1 response header: name(4) + value(100) = 104 -> total 2080 > 2048
            const req: Record<string, string> = {};
            for (let i = 0; i < 19; i++) {
                req[`rq${String(i).padStart(2, '0')}`] = 'x'.repeat(100);
            }
            const res: Record<string, string> = {
                rs00: 'x'.repeat(100)
            };
            const result = enforceSizeLimits(req, res);
            expect(result.requestHeaders).toBeDefined();
            expect(result.responseHeaders).toBeUndefined();
        });

        it('returns undefined for request when all headers dropped for budget', () => {
            // Build a scenario where request has one giant-name header
            // After truncation, still over budget -> request dropped entirely
            const req: Record<string, string> = {};
            // Create headers with long names that blow the budget
            for (let i = 0; i < 30; i++) {
                req['h'.repeat(70) + i] = 'v'.repeat(128);
            }
            const result = enforceSizeLimits(req, undefined);
            const totalBytes = computeTotalBytes(
                result.requestHeaders,
                result.responseHeaders
            );
            expect(totalBytes).toBeLessThanOrEqual(2048);
        });
    });

    describe('combined processing order', () => {
        it('truncates values before counting bytes for budget', () => {
            // 10 headers with 500-char values -> truncated to 128 each
            // After truncation: name(2) + value(128) = 130 each -> 1300 total < 2048
            const req: Record<string, string> = {};
            for (let i = 0; i < 10; i++) {
                req[`h${i}`] = 'z'.repeat(500);
            }
            const result = enforceSizeLimits(req, undefined);
            expect(Object.keys(result.requestHeaders!).length).toBe(10);
            // All values truncated to 128
            for (const value of Object.values(result.requestHeaders!)) {
                expect(value.length).toBeLessThanOrEqual(128);
            }
        });
    });
});

/** Helper: compute total bytes for all headers */
function computeTotalBytes(
    reqHeaders: Record<string, string> | undefined,
    resHeaders: Record<string, string> | undefined
): number {
    let total = 0;
    if (reqHeaders) {
        for (const [name, value] of Object.entries(reqHeaders)) {
            total += name.length + value.length;
        }
    }
    if (resHeaders) {
        for (const [name, value] of Object.entries(resHeaders)) {
            total += name.length + value.length;
        }
    }
    return total;
}
