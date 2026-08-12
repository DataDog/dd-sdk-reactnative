/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

jest.mock('../src/turbo-modules/NativeDdLogs', () => ({
    __esModule: true,
    default: {
        debug: jest.fn(() => Promise.resolve()),
        info: jest.fn(() => Promise.resolve()),
        warn: jest.fn(() => Promise.resolve()),
        error: jest.fn(() => Promise.resolve()),
        debugWithError: jest.fn(() => Promise.resolve()),
        infoWithError: jest.fn(() => Promise.resolve()),
        warnWithError: jest.fn(() => Promise.resolve()),
        errorWithError: jest.fn(() => Promise.resolve())
    }
}));

import { DdLogs } from '../src/DdLogsVega';
import NativeDdLogs from '../src/turbo-modules/NativeDdLogs';

describe('DdLogsVega', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it.each(['debug', 'info', 'warn', 'error'] as const)(
        'forwards a %s log with context',
        async level => {
            await DdLogs[level]('Vega log', { source: 'test' });

            expect(NativeDdLogs[level]).toHaveBeenCalledWith('Vega log', {
                source: 'test'
            });
        }
    );

    it('forwards error details and compatibility attributes', async () => {
        await DdLogs.error(
            'Vega error log',
            'VegaSampleError',
            'The sample requested an error log',
            'sample stack',
            { source: 'test' },
            'vega-log-fingerprint'
        );

        expect(NativeDdLogs.errorWithError).toHaveBeenCalledWith(
            'Vega error log',
            'VegaSampleError',
            'The sample requested an error log',
            'sample stack',
            {
                source: 'test',
                '_dd.error.source_type': 'react-native',
                '_dd.error.fingerprint': 'vega-log-fingerprint'
            }
        );
    });
});
