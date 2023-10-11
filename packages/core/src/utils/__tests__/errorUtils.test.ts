/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getErrorName } from '../errorUtils';

describe('errorUtils', () => {
    describe('getErrorName', () => {
        it('returns the error.name if defined', () => {
            let error;
            try {
                // eslint-disable-next-line no-unused-expressions
                error.bad.property;
            } catch (e) {
                // error will be a TypeError
                error = e;
            }

            expect(getErrorName(error)).toBe('TypeError');
        });

        it('returns the error.name if defined by an extension', () => {
            class CustomError extends Error {
                name = 'CustomError';
            }

            const error = new CustomError('some custom error');
            expect(getErrorName(error)).toBe('CustomError');
        });

        it('returns "Error" for an Error object', () => {
            const error = new Error('some error');
            expect(getErrorName(error)).toBe('Error');
        });

        it('returns "Error" for an object without a name property', () => {
            const error = { message: 'some error' };
            expect(getErrorName(error)).toBe('Error');
        });

        it('returns "Error" for an non object types', () => {
            expect(getErrorName(undefined)).toBe('Error');
            expect(getErrorName(null)).toBe('Error');
            expect(getErrorName('some error')).toBe('Error');
        });
    });
});
