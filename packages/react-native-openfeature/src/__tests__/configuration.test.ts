/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getPrecomputedContext as getMobilePrecomputedContext } from '@datadog/mobile-react-native';
import type { ParsedFlagsConfiguration } from '@datadog/mobile-react-native';

import { getPrecomputedContext } from '../configuration';

jest.mock('@datadog/mobile-react-native', () => ({
    getPrecomputedContext: jest.fn()
}));

describe('getPrecomputedContext', () => {
    it('forwards the React Native SDK helper', () => {
        const configuration = {} as ParsedFlagsConfiguration;
        jest.mocked(getMobilePrecomputedContext).mockReturnValue({
            targetingKey: 'user-1'
        });

        expect(getPrecomputedContext(configuration)).toEqual({
            targetingKey: 'user-1'
        });
        expect(getMobilePrecomputedContext).toHaveBeenCalledWith(configuration);
    });
});
