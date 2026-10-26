/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER } from '../../../graphql/graphqlHeaders';
import { compileHeaderCaptureConfig } from '../../../headerCapture/compileHeaderConfig';
import {
    createHeaderCaptureState,
    fetchHeadersToRecord,
    finalizeCapturedHeaders,
    recordRequestHeader
} from '../headerCapture';

jest.mock('../../../../../../InternalLog');

const URL = 'https://api.example.com/users';

describe('headerCapture', () => {
    describe('createHeaderCaptureState', () => {
        it('does not accumulate request headers when capture is disabled', () => {
            const state = createHeaderCaptureState(null);
            recordRequestHeader(state, 'Content-Type', 'application/json');

            expect(state.requestHeaders).toBeUndefined();
        });

        it('treats a missing config as disabled', () => {
            expect(createHeaderCaptureState(undefined)).toEqual({
                config: null,
                requestHeaders: undefined
            });
        });
    });

    describe('recordRequestHeader', () => {
        it('ignores Datadog internal and sensitive headers', () => {
            const state = createHeaderCaptureState(
                compileHeaderCaptureConfig('defaults')
            );
            recordRequestHeader(
                state,
                DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
                'query'
            );
            recordRequestHeader(state, 'Authorization', 'Bearer secret');
            recordRequestHeader(state, 'Content-Type', 'application/json');

            expect(state.requestHeaders).toEqual({
                'Content-Type': 'application/json'
            });
        });
    });

    describe('finalizeCapturedHeaders', () => {
        it('returns no headers when capture is disabled', () => {
            const responseHeaders = jest.fn(() => ({ etag: 'abc' }));

            expect(
                finalizeCapturedHeaders({
                    state: createHeaderCaptureState(null),
                    url: URL,
                    statusCode: 200,
                    responseHeaders
                })
            ).toEqual({});
            expect(responseHeaders).not.toHaveBeenCalled();
        });

        it('returns no headers for status 0 requests', () => {
            const state = createHeaderCaptureState(
                compileHeaderCaptureConfig('defaults')
            );
            recordRequestHeader(state, 'Content-Type', 'application/json');

            expect(
                finalizeCapturedHeaders({
                    state,
                    url: URL,
                    statusCode: 0,
                    responseHeaders: () => ({ etag: 'abc' })
                })
            ).toEqual({});
        });

        it('filters by rules and enforces size limits', () => {
            const state = createHeaderCaptureState(
                compileHeaderCaptureConfig('defaults')
            );
            recordRequestHeader(state, 'Content-Type', 'application/json');
            recordRequestHeader(state, 'X-Custom', 'value');

            const result = finalizeCapturedHeaders({
                state,
                url: URL,
                statusCode: 200,
                responseHeaders: () => ({
                    etag: 'x'.repeat(500),
                    'x-custom': 'value'
                })
            });

            expect(result.capturedRequestHeaders).toEqual({
                'Content-Type': 'application/json'
            });
            expect(result.capturedResponseHeaders?.ETag).toHaveLength(128);
            expect(
                result.capturedResponseHeaders?.['x-custom']
            ).toBeUndefined();
        });
    });

    describe('fetchHeadersToRecord', () => {
        it('lowercases header names', () => {
            expect(
                fetchHeadersToRecord(
                    new Headers({ 'Cache-Control': 'no-cache' })
                )
            ).toEqual({ 'cache-control': 'no-cache' });
        });

        it('returns an empty record when headers cannot be iterated', () => {
            expect(fetchHeadersToRecord(undefined)).toEqual({});
            expect(
                fetchHeadersToRecord(({
                    get: () => null
                } as unknown) as Headers)
            ).toEqual({});
        });
    });
});
