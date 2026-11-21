/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { SdkVerbosity } from '../../config/types/SdkVerbosity';

jest.mock('../../InternalLog', () => ({ InternalLog: { log: jest.fn() } }));
jest.mock('../../specs/NativeDdFlags', () => ({ getNativeDdFlags: jest.fn() }));

describe.each(['trackExposure', 'trackRumEvaluation'] as const)(
    '%s diagnostics',
    method => {
        let native: Record<typeof method, jest.Mock>;
        let getNative: jest.Mock;
        let log: jest.Mock;
        let submit: () => void;

        beforeEach(() => {
            jest.resetModules();
            getNative = jest.requireMock('../../specs/NativeDdFlags')
                .getNativeDdFlags;
            log = jest.requireMock('../../InternalLog').InternalLog.log;
            native = {
                [method]: jest.fn().mockResolvedValue(undefined)
            } as Record<typeof method, jest.Mock>;
            getNative.mockReturnValue(native);
            const tracking = jest.requireActual<typeof import('../tracking')>(
                '../tracking'
            );
            submit = () => {
                const context = { targetingKey: 'user', attributes: {} };
                if (method === 'trackExposure') {
                    tracking.__ddTrackFlagExposure(
                        'default',
                        'flag',
                        {
                            allocationKey: 'allocation',
                            variationKey: 'on',
                            doLog: true
                        },
                        context
                    );
                } else {
                    tracking.__ddTrackFlagRumEvaluation(
                        'default',
                        'flag',
                        'on',
                        context
                    );
                }
            };
        });

        it('warns once per failure reason and still retries native delivery', async () => {
            getNative.mockReturnValue(null);
            submit();
            submit();
            getNative.mockReturnValue({});
            submit();
            submit();
            getNative.mockReturnValue(native);
            native[method].mockRejectedValue(new Error('native rejected'));
            submit();
            submit();
            await Promise.resolve();

            expect(log).toHaveBeenCalledTimes(3);
            for (const reason of [
                'missing native module',
                'unsupported native method',
                'native call failed'
            ]) {
                expect(log).toHaveBeenCalledWith(
                    expect.stringContaining(`${method}: ${reason}`),
                    SdkVerbosity.WARN
                );
            }
            expect(log).toHaveBeenCalledWith(
                expect.stringContaining('native rejected'),
                SdkVerbosity.WARN
            );
            native[method].mockResolvedValue(undefined);
            submit();
            expect(native[method]).toHaveBeenCalledTimes(3);
            expect(log).toHaveBeenCalledTimes(3);
        });

        it('contains synchronous failures and logs their message only once', () => {
            native[method].mockImplementation(() => {
                throw new Error('bridge unavailable');
            });
            expect(submit).not.toThrow();
            expect(submit).not.toThrow();
            expect(log).toHaveBeenCalledTimes(1);
            expect(log).toHaveBeenCalledWith(
                expect.stringContaining('bridge unavailable'),
                SdkVerbosity.WARN
            );
        });

        it('contains a diagnostic failure after a rejected native call', async () => {
            native[method].mockRejectedValue(new Error('native rejected'));
            log.mockImplementation(() => {
                throw new Error('logger unavailable');
            });
            submit();
            await Promise.resolve();
            expect(log).toHaveBeenCalledTimes(1);
        });
    }
);
