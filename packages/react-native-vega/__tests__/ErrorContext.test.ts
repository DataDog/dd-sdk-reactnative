/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorSource } from '@datadog/mobile-react-native';

import { DdLogs } from '../src/DdLogsVega';
import { DdRum } from '../src/DdRumVega';

let mockDebugId: string | undefined = 'bundle-debug-id';
const mockGet = jest.fn();
const mockRum = { addError: jest.fn() };
const mockLogs = { log: jest.fn() };
jest.mock('../../core/src/metro/debugIdResolver', () => ({
    get debugId() {
        return mockDebugId;
    }
}));
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

describe('Vega error symbolication metadata', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockDebugId = 'bundle-debug-id';
        mockGet.mockImplementation(name =>
            name === 'DdRum' ? mockRum : mockLogs
        );
    });
    it('enriches RUM errors without changing application attributes', async () => {
        const context = Object.freeze({
            keep: true,
            '_dd.error.source_type': 'other',
            '_dd.debug_id': 'other'
        });
        await DdRum.addError(
            'error',
            'SOURCE' as ErrorSource,
            'stack',
            context,
            42
        );
        expect(mockRum.addError).toHaveBeenCalledWith(
            'error',
            'SOURCE',
            'stack',
            {
                keep: true,
                '_dd.error.source_type': 'react-native',
                '_dd.debug_id': 'bundle-debug-id'
            },
            42,
            ''
        );
        expect(context['_dd.debug_id']).toBe('other');
    });
    it.each(['debug', 'info', 'warn', 'error'] as const)(
        'enriches %s error logs',
        async level => {
            await DdLogs[level]('message', 'TypeError', 'error', 'stack', {
                keep: true
            });
            expect(mockLogs.log).toHaveBeenCalledWith(
                level,
                'message',
                'TypeError',
                'error',
                'stack',
                {
                    keep: true,
                    '_dd.error.source_type': 'react-native',
                    '_dd.debug_id': 'bundle-debug-id'
                }
            );
        }
    );
    it('does not turn an ordinary log into an error log', async () => {
        await DdLogs.info('message', { keep: true });
        expect(mockLogs.log).toHaveBeenCalledWith(
            'info',
            'message',
            '',
            '',
            '',
            { keep: true }
        );
    });
    it('keeps errors usable without a bundle Debug ID', async () => {
        mockDebugId = undefined;
        await DdRum.addError('error', 'SOURCE' as ErrorSource, 'stack');
        expect(mockRum.addError.mock.calls[0][3]).toEqual({
            '_dd.error.source_type': 'react-native'
        });
    });
});
