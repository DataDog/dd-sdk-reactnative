/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { DdLogs } from '../DdLogs';
import type { LogEventMapper } from '../types';

describe('DdLogs', () => {
    describe('log event mapper', () => {
        beforeEach(() => {
            DdLogs.unregisterLogEventMapper();
            NativeModules.DdLogs.debug.mockClear();
            NativeModules.DdLogs.info.mockClear();
            NativeModules.DdLogs.warn.mockClear();
            NativeModules.DdLogs.error.mockClear();
        });

        it('registers event mapper and maps logs', async () => {
            const logEventMapper: LogEventMapper = log => {
                log.message = 'new message';
                log.context = { newContext: 'context' };
                return log;
            };
            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.info('original message', {});
            expect(
                NativeModules.DdLogs.info
            ).toHaveBeenCalledWith('new message', { newContext: 'context' });
        });

        it('sends initial log if no event mapper is registered', async () => {
            await DdLogs.info('original message', {});
            expect(NativeModules.DdLogs.info).toHaveBeenCalledWith(
                'original message',
                {}
            );
        });

        it('drops the event if the mapper returns null', async () => {
            const logEventMapper: LogEventMapper = log => {
                return null;
            };
            DdLogs.registerLogEventMapper(logEventMapper);

            await DdLogs.info('original message', {});
            expect(NativeModules.DdLogs.info).not.toHaveBeenCalled();
        });
    });
});
