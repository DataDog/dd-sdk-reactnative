/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../config/types/SdkVerbosity';
import { DdFlags } from '../DdFlags';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('DdFlags', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset state of DdFlags instance.
        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });
    });

    it('should always call the native enable method with enabled set to true', async () => {
        await DdFlags.enable();

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true
        });
    });

    it('should call the native enable method with the correct configuration', async () => {
        await DdFlags.enable({
            customExposureEndpoint: 'https://example.com',
            customFlagsEndpoint: 'https://example.com',
            trackExposures: false,
            rumIntegrationEnabled: false
        });

        expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
            enabled: true,
            customExposureEndpoint: 'https://example.com',
            customFlagsEndpoint: 'https://example.com',
            trackExposures: false,
            rumIntegrationEnabled: false
        });
    });

    describe('flagSelection', () => {
        const MALFORMED_MESSAGE =
            'flagSelection was not sent (malformed_selection: flagSelection must be an object with optional tags and keyPatterns string arrays). Loading the full flag configuration.';

        it('passes a copy of the selection to the native enable method without canonicalizing it', async () => {
            const tags = [' team:checkout ', 'team:checkout', ''];
            const keyPatterns = ['checkout-*'];

            await DdFlags.enable({
                customFlagsEndpoint: 'https://example.com',
                flagSelection: { tags, keyPatterns }
            });

            expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                enabled: true,
                customFlagsEndpoint: 'https://example.com',
                flagSelection: {
                    tags: [' team:checkout ', 'team:checkout', ''],
                    keyPatterns: ['checkout-*']
                }
            });
            const sent = (NativeModules.DdFlags.enable as jest.Mock).mock
                .calls[0][0].flagSelection;
            expect(sent.tags).not.toBe(tags);
            expect(sent.keyPatterns).not.toBe(keyPatterns);
            expect(InternalLog.log).not.toHaveBeenCalled();
        });

        it('passes only the lists that are set', async () => {
            await DdFlags.enable({
                flagSelection: { keyPatterns: ['checkout-*'] }
            });

            expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                enabled: true,
                flagSelection: { keyPatterns: ['checkout-*'] }
            });
        });

        it.each([
            ['undefined', undefined],
            ['null', null],
            ['an object without lists', {}],
            ['an object with null lists', { tags: null, keyPatterns: null }]
        ])(
            'passes no selection and logs nothing when the selection is %s',
            async (_, flagSelection) => {
                await DdFlags.enable({ flagSelection } as any);

                expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                    enabled: true
                });
                expect(InternalLog.log).not.toHaveBeenCalled();
            }
        );

        it('passes no selection and logs the malformed message when the selection is malformed', async () => {
            await DdFlags.enable({
                trackExposures: false,
                flagSelection: { tags: ['team:checkout', 42] }
            } as any);

            expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                enabled: true,
                trackExposures: false
            });
            expect(InternalLog.log).toHaveBeenCalledTimes(1);
            expect(InternalLog.log).toHaveBeenCalledWith(
                MALFORMED_MESSAGE,
                SdkVerbosity.ERROR
            );
        });

        it('logs the malformed message once per enable call', async () => {
            const configuration = {
                flagSelection: { keyPatterns: ['checkout-\uD800'] }
            } as any;

            await DdFlags.enable(configuration);
            expect(InternalLog.log).toHaveBeenCalledTimes(1);

            await DdFlags.enable(configuration);
            expect(InternalLog.log).toHaveBeenCalledTimes(2);
            expect(InternalLog.log).toHaveBeenNthCalledWith(
                2,
                MALFORMED_MESSAGE,
                SdkVerbosity.ERROR
            );
        });

        it('passes no selection when a getter of the selection throws', async () => {
            const flagSelection = {
                get tags(): string[] {
                    throw new Error('getter failure');
                }
            };

            await expect(
                DdFlags.enable({ flagSelection })
            ).resolves.toBeUndefined();

            expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                enabled: true
            });
            expect(InternalLog.log).toHaveBeenCalledWith(
                MALFORMED_MESSAGE,
                SdkVerbosity.ERROR
            );
        });

        it('accepts a null configuration', async () => {
            await DdFlags.enable(null as any);

            expect(NativeModules.DdFlags.enable).toHaveBeenCalledWith({
                enabled: true
            });
        });
    });

    it('should print an error when trying to retrieve a client before DdFlags.enable() has been called', async () => {
        DdFlags.getClient();

        expect(InternalLog.log).toHaveBeenCalledWith(
            '`DdFlags.getClient()` called before Datadog Flags feature have been enabled. Client will fall back to serving default flag values.',
            SdkVerbosity.ERROR
        );
    });
});
