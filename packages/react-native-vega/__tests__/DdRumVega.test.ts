/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ErrorSource } from '@datadog/mobile-react-native';

import { DdRum } from '../src/DdRumVega';
import NativeDdRum from '../src/turbo-modules/NativeDdRum';

jest.mock('@datadog/mobile-react-native/internal', () => ({
    DdAttributes: {
        errorSourceType: '_dd.error.source_type',
        debugId: '_dd.debug_id'
    },
    debugId: 'vega-test-debug-id'
}));

jest.mock('../src/turbo-modules/NativeDdRum', () => ({
    __esModule: true,
    default: {
        addError: jest.fn(() => Promise.resolve())
    }
}));

describe('DdRumVega', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('attaches React Native source information and the Metro Debug ID to errors', async () => {
        await DdRum.addError(
            'Vega JavaScript error',
            ErrorSource.SOURCE,
            'stack trace',
            { source: 'test' },
            1234,
            'fingerprint'
        );

        expect(NativeDdRum.addError).toHaveBeenCalledWith(
            'Vega JavaScript error',
            ErrorSource.SOURCE,
            'stack trace',
            {
                source: 'test',
                '_dd.error.source_type': 'react-native',
                '_dd.debug_id': 'vega-test-debug-id'
            },
            1234,
            'fingerprint'
        );
    });
});
