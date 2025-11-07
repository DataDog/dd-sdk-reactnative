/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { isDatadogCustomHeader } from '../headers';

describe('headers', () => {
    describe('isDatadogCustomHeader', () => {
        it('returns false for non-custom headers', () => {
            expect(isDatadogCustomHeader('non-custom-header')).toBeFalsy();
        });
    });
});
