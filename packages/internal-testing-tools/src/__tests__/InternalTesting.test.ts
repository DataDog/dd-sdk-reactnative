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

    describe('getReport', () => {
        beforeEach(() => {
            jest.spyOn(InternalTesting, 'getAllEvents').mockImplementation(
                _ => {
                    return new Promise(resolve => resolve([]));
                }
            );
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('returns the report no tests have been run', () => {
            const report = InternalTesting.getReport();

            expect(report.status).toBe('NOT_RUN');
            expect(report.assertions).toHaveLength(0);
        });

        it('returns the report when all tests have been successful', async () => {
            const { logs, trace } = await InternalTesting.getEvents();

            logs.toHaveLength(0);
            trace.toHaveLength(0);

            const report = InternalTesting.getReport();

            expect(report.status).toBe('PASSED');
            expect(report.assertions).toHaveLength(2);
        });

        it('returns the report when one test has failed', async () => {
            const { logs, trace } = await InternalTesting.getEvents();

            logs.toHaveLength(0);
            trace.toHaveLength(1);

            const report = InternalTesting.getReport();

            expect(report.status).toBe('FAILED');
            expect(report.assertions).toHaveLength(2);
        });
    });
});
