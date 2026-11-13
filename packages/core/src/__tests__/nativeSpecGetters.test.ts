/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

describe('native spec getters', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([
        ['../specs/NativeDdSdk', 'getNativeDdSdk', 'DdSdk'],
        ['../specs/NativeDdRum', 'getNativeDdRum', 'DdRum'],
        ['../specs/NativeDdLogs', 'getNativeDdLogs', 'DdLogs'],
        ['../specs/NativeDdTrace', 'getNativeDdTrace', 'DdTrace'],
        ['../specs/NativeDdFlags', 'getNativeDdFlags', 'DdFlags']
    ])(
        '%s retries a missing module and caches it once found',
        (modulePath, getterName, registryName) => {
            jest.isolateModules(() => {
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                const { TurboModuleRegistry } = require('react-native');
                const nativeModule = { name: registryName };
                const getSpy = jest
                    .spyOn(TurboModuleRegistry, 'get')
                    .mockReturnValueOnce(null)
                    .mockReturnValue(nativeModule);
                // eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires
                const getter = require(modulePath)[getterName];

                expect(getter()).toBeNull();
                expect(getter()).toBe(nativeModule);
                expect(getter()).toBe(nativeModule);
                expect(getSpy).toHaveBeenCalledTimes(2);
                expect(getSpy).toHaveBeenCalledWith(registryName);
            });
        }
    );

    it('FlagsClient retries a missing module and uses it for fetching and tracking', async () => {
        await jest.isolateModulesAsync(async () => {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { TurboModuleRegistry } = require('react-native');
            const nativeModule = {
                setEvaluationContext: jest.fn().mockResolvedValue({
                    feature: { key: 'feature', value: true, reason: 'STATIC' }
                }),
                trackEvaluation: jest.fn().mockResolvedValue(undefined)
            };
            const getSpy = jest
                .spyOn(TurboModuleRegistry, 'get')
                .mockReturnValueOnce(null)
                .mockReturnValue(nativeModule);
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { FlagsClient } = require('../flags/FlagsClient');
            const client = new FlagsClient('late-native');
            const context = { targetingKey: 'user', attributes: {} };

            expect(getSpy).not.toHaveBeenCalled();
            await expect(
                client.setEvaluationContext(context)
            ).rejects.toThrow();
            await expect(
                client.setEvaluationContext(context)
            ).resolves.toBeUndefined();
            expect(nativeModule.setEvaluationContext).toHaveBeenCalledWith(
                'late-native',
                'user',
                {}
            );
            expect(client.getBooleanValue('feature', false)).toBe(true);
            expect(nativeModule.trackEvaluation).toHaveBeenCalledWith(
                'late-native',
                'feature',
                expect.objectContaining({ value: true }),
                'user',
                {}
            );
            expect(getSpy).toHaveBeenCalledTimes(2);
            expect(getSpy).toHaveBeenCalledWith('DdFlags');
        });
    });

    it('DdSdkWrapper picks up a module that was missing on first use', () => {
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { TurboModuleRegistry } = require('react-native');
            const nativeModule = { clearAllData: jest.fn() };
            jest.spyOn(TurboModuleRegistry, 'get')
                .mockReturnValueOnce(null)
                .mockReturnValue(nativeModule);
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { DdSdkWrapper } = require('../sdk/DdSdkInternal');
            const sdk = new DdSdkWrapper();

            expect(() => sdk.clearAllData()).toThrow();
            sdk.clearAllData();
            expect(nativeModule.clearAllData).toHaveBeenCalledTimes(1);
        });
    });
});
