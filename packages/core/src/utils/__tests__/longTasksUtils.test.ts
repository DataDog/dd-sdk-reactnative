/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { adaptLongTaskThreshold } from '../longTasksUtils';

describe('adaptLongTaskThreshold', () => {
    it('returns 0 if false is given', () => {
        expect(adaptLongTaskThreshold(false)).toBe(0);
    });
    it('returns 0 if 0 is given', () => {
        expect(adaptLongTaskThreshold(0)).toBe(0);
    });
    it('returns 100 if positive below 100 is given', () => {
        expect(adaptLongTaskThreshold(42)).toBe(100);
    });
    it('returns 100 if negative is given', () => {
        expect(adaptLongTaskThreshold(-1)).toBe(100);
    });
    it('returns the value if an acceptable value is given', () => {
        expect(adaptLongTaskThreshold(700)).toBe(700);
        expect(adaptLongTaskThreshold(2000)).toBe(2000);
    });
    it('returns 5000 if a value too high is given', () => {
        expect(adaptLongTaskThreshold(7000)).toBe(5000);
    });
});
