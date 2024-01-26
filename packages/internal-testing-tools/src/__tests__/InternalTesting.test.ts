/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalTesting } from '../InternalTesting';

beforeEach(() => {
    NativeModules.DdInternalTesting.enable.mockClear();
});

describe('InternalTesting', () => {
    describe('enable', () => {
        it('calls native internal testing module with default configuration', () => {
            InternalTesting.enable();

            expect(
                NativeModules.DdInternalTesting.enable
            ).toHaveBeenCalledWith();
        });
    });
});
