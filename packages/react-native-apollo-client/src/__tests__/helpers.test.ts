/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getOperationName, getVariables, getOperationType } from '../helpers';

import {
    createCatOperation,
    getCountriesOperation,
    getCountryOperation
} from './__utils__/operationMock';

describe('helpers', () => {
    describe('getOperationName', () => {
        it('returns operation name if it exists', () => {
            expect(getOperationName(getCountryOperation)).toBe(
                'CountryDetails'
            );
        });
        it('returns null if the query is unnamed', () => {
            expect(getOperationName(getCountriesOperation)).toBeNull();
        });
    });

    describe('getVariables', () => {
        it('returns variables as a string if they exist', () => {
            expect(getVariables(getCountryOperation)).toBe('{"code":"BE"}');
            expect(getVariables(getCountriesOperation)).toBe('{}');
        });
        it('returns null if there are no variables', () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(getVariables({})).toBeNull();
        });
        it('does not crash if the variables are not serializable', () => {
            // Case of circular reference
            const root = {};
            const child = { root };
            root['circular'] = child;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(getVariables({ variables: { root } })).toBeNull();
        });
    });

    describe('getOperationType', () => {
        it('returns operation type for a query', () => {
            expect(getOperationType(getCountryOperation)).toBe('query');
            expect(getOperationType(getCountriesOperation)).toBe('query');
        });
        it('returns operation type for a mutation', () => {
            expect(getOperationType(createCatOperation)).toBe('mutation');
        });
        it('does not crash if there is no operation type', () => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(getOperationType({})).toBeNull();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(getOperationType({ query: { definitions: [] } })).toBeNull();
        });
    });
});
