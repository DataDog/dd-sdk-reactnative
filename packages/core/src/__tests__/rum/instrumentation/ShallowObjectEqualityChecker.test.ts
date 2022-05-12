/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { areObjectShallowEqual } from '../../../rum/instrumentation/ShallowObjectEqualityChecker';

describe('areObjectValuesEqual', () => {
    it('returns false for different object values', () => {
        const objectA = { a: 22 };
        const objectB = { a: 23 };
        expect(areObjectShallowEqual(objectA, objectB)).toBe(false);
    });
    it('returns false for subsets', () => {
        const objectA = { a: 22 };
        const objectB = { a: 22, b: 66 };
        expect(areObjectShallowEqual(objectA, objectB)).toBe(false);
        expect(areObjectShallowEqual(objectB, objectA)).toBe(false);
    });
    it('returns false for equal but not stricly equal values', () => {
        const objectA = { a: false };
        const objectB = { a: 0 };
        expect(areObjectShallowEqual(objectA, objectB)).toBe(false);
    });
    it('returns true for identical object values', () => {
        const objectA = { a: 22 };
        const objectB = { a: 22 };
        expect(areObjectShallowEqual(objectA, objectB)).toBe(true);
    });
});
