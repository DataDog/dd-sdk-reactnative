/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ErrorSource } from '@datadog/mobile-react-native';

import { DdLogs } from '../src/DdLogsVega';

const mockNative = { log: jest.fn() };
const mockGet = jest.fn();
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

describe('Vega logs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockReturnValue(mockNative);
    });
    it.each(['debug', 'info', 'warn', 'error'] as const)(
        'forwards %s logs and attributes',
        async level => {
            const context = {
                count: 3,
                enabled: false,
                nested: { value: null }
            };
            await DdLogs[level]('message', context);
            expect(mockNative.log).toHaveBeenCalledWith(
                level,
                'message',
                '',
                '',
                '',
                context
            );
            await DdLogs[level]('default context');
            expect(mockNative.log).toHaveBeenLastCalledWith(
                level,
                'default context',
                '',
                '',
                '',
                {}
            );
        }
    );
    it.each(['debug', 'info', 'warn', 'error'] as const)(
        'forwards %s error details without changing caller attributes',
        async level => {
            const context = Object.freeze({ custom: true });
            await DdLogs[level](
                'message',
                'TypeError',
                'failure',
                'stack',
                context,
                'group'
            );
            expect(mockNative.log).toHaveBeenCalledWith(
                level,
                'message',
                'TypeError',
                'failure',
                'stack',
                {
                    custom: true,
                    '_dd.error.fingerprint': 'group'
                }
            );
            expect(context).toEqual({ custom: true });
        }
    );
    it('handles error overloads with missing optional fields', async () => {
        await DdLogs.error('message', undefined, undefined, 'stack');
        expect(mockNative.log).toHaveBeenCalledWith(
            'error',
            'message',
            '',
            '',
            'stack',
            {}
        );
    });
    it('accepts a source-only error overload without shifting attributes', async () => {
        await DdLogs.error(
            'message',
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            'SOURCE' as ErrorSource
        );
        expect(mockNative.log).toHaveBeenCalledWith(
            'error',
            'message',
            '',
            '',
            '',
            {}
        );
    });
    it('ignores missing, throwing, and rejecting native modules', async () => {
        mockGet.mockReturnValueOnce(null).mockImplementationOnce(() => {
            throw Error('lookup');
        });
        await expect(DdLogs.info('message')).resolves.toBeUndefined();
        await expect(DdLogs.info('message')).resolves.toBeUndefined();
        mockNative.log.mockImplementationOnce(() => {
            throw Error('call');
        });
        await expect(DdLogs.info('message')).resolves.toBeUndefined();
        mockNative.log.mockRejectedValueOnce(Error('rejected'));
        await expect(DdLogs.info('message')).resolves.toBeUndefined();
    });
});
