/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { extractGraphQLErrors } from '../graphqlUtils';

describe('extractGraphQLErrors', () => {
    it('extracts message and code from extensions', () => {
        const errors = [
            {
                message: 'Not found',
                extensions: { code: 'NOT_FOUND' }
            }
        ];
        expect(extractGraphQLErrors(errors)).toEqual([
            { message: 'Not found', code: 'NOT_FOUND' }
        ]);
    });

    it('extracts code from legacy top-level field', () => {
        const errors = [{ message: 'Bad', code: 'BAD_REQUEST' }];
        expect(extractGraphQLErrors(errors)).toEqual([
            { message: 'Bad', code: 'BAD_REQUEST' }
        ]);
    });

    it('prefers extensions.code over top-level code', () => {
        const errors = [
            {
                message: 'Error',
                code: 'LEGACY',
                extensions: { code: 'PREFERRED' }
            }
        ];
        expect(extractGraphQLErrors(errors)[0].code).toBe('PREFERRED');
    });

    it('skips errors without a message', () => {
        const errors = [
            { code: 'NO_MESSAGE' },
            { message: 'Valid' },
            null,
            undefined
        ];
        expect(extractGraphQLErrors(errors)).toEqual([{ message: 'Valid' }]);
    });

    it('extracts valid locations', () => {
        const errors = [
            {
                message: 'Error',
                locations: [{ line: 1, column: 5 }]
            }
        ];
        expect(extractGraphQLErrors(errors)).toEqual([
            { message: 'Error', locations: [{ line: 1, column: 5 }] }
        ]);
    });

    it('filters out invalid locations', () => {
        const errors = [
            {
                message: 'Error',
                locations: [
                    { line: 1, column: 5 },
                    { line: 'bad', column: 3 },
                    null
                ]
            }
        ];
        expect(extractGraphQLErrors(errors)[0].locations).toEqual([
            { line: 1, column: 5 }
        ]);
    });

    it('omits locations when all entries are invalid', () => {
        const errors = [
            {
                message: 'Error',
                locations: [{ line: 'bad', column: 3 }, null, {}]
            }
        ];
        expect(extractGraphQLErrors(errors)[0].locations).toBeUndefined();
    });

    it('extracts path with valid string and number segments', () => {
        const errors = [{ message: 'Error', path: ['user', 0, 'name'] }];
        expect(extractGraphQLErrors(errors)[0].path).toEqual([
            'user',
            0,
            'name'
        ]);
    });

    it('filters out invalid path segments', () => {
        const errors = [
            {
                message: 'Error',
                path: ['user', { nested: true }, 'name', null, true]
            }
        ];
        expect(extractGraphQLErrors(errors)[0].path).toEqual(['user', 'name']);
    });

    it('omits path when all segments are invalid', () => {
        const errors = [
            {
                message: 'Error',
                path: [null, undefined, true, { obj: 1 }]
            }
        ];
        expect(extractGraphQLErrors(errors)[0].path).toBeUndefined();
    });

    it('omits path when not present', () => {
        const errors = [{ message: 'Error' }];
        expect(extractGraphQLErrors(errors)[0].path).toBeUndefined();
    });

    it('filters out extensions and other extra fields', () => {
        const errors = [
            {
                message: 'Error',
                extensions: {
                    code: 'FAIL',
                    stacktrace: ['line1'],
                    custom: 'data'
                },
                customField: 'should be dropped'
            }
        ];
        const result = extractGraphQLErrors(errors)[0];
        expect(result).toEqual({ message: 'Error', code: 'FAIL' });
        expect((result as any).extensions).toBeUndefined();
        expect((result as any).customField).toBeUndefined();
    });

    it('returns empty array for empty input', () => {
        expect(extractGraphQLErrors([])).toEqual([]);
    });
});
