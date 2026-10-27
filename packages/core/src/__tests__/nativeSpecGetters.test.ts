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
