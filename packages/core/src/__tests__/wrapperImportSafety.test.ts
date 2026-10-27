/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * The spy must be installed on the `react-native` instance from inside
 * `jest.isolateModules`: lookups made by isolated modules go through that
 * registry, not the one imported at the top of a test file.
 */
const requireCountingLookups = (modulePath: string) => {
    let lookups: string[] = [];
    let mod: any;
    jest.isolateModules(() => {
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const { TurboModuleRegistry } = require('react-native');
        const getSpy = jest.spyOn(TurboModuleRegistry, 'get');
        // eslint-disable-next-line global-require, import/no-dynamic-require
        mod = require(modulePath);
        lookups = getSpy.mock.calls.map(call => call[0] as string);
    });
    return { mod, lookups };
};

describe('SDK wrappers are import-safe', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        // Singletons live on globalThis, which isolateModules does not reset.
        const g = globalThis as Record<PropertyKey, unknown>;
        for (const symbol of Object.getOwnPropertySymbols(g)) {
            if (symbol.description?.startsWith('com.datadog.reactnative')) {
                delete g[symbol];
            }
        }
    });

    it.each([
        ['../rum/DdRum', 'DdRum'],
        ['../logs/DdLogs', 'DdLogs'],
        ['../trace/DdTrace', 'DdTrace'],
        ['../flags/DdFlags', 'DdFlags']
    ])('importing %s performs no native lookup', modulePath => {
        expect(requireCountingLookups(modulePath).lookups).toEqual([]);
    });

    it('importing the public barrel performs no native lookup', () => {
        expect(requireCountingLookups('../index').lookups).toEqual([]);
    });

    it('importing the internal entry performs no native lookup', () => {
        expect(requireCountingLookups('../internal').lookups).toEqual([]);
    });
});

describe('SDK wrappers do not rely on Proxy', () => {
    // Older Android JSC and Hermes versions supported by the SDK lack Proxy.
    it.each(['../sdk/DdSdkInternal', '../index', '../internal'])(
        'importing %s works without Proxy',
        modulePath => {
            const g = globalThis as Record<string, unknown>;
            const originalProxy = g.Proxy;
            try {
                delete g.Proxy;
                expect(() => requireCountingLookups(modulePath)).not.toThrow();
            } finally {
                g.Proxy = originalProxy;
            }
        }
    );

    it('DdSdkWrapper forwards every method to the native module', () => {
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { TurboModuleRegistry } = require('react-native');
            const nativeModule: Record<string, jest.Mock> = {};
            jest.spyOn(TurboModuleRegistry, 'get').mockReturnValue(
                nativeModule
            );
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const { DdSdkWrapper } = require('../sdk/DdSdkInternal');
            const sdk = new DdSdkWrapper();
            const methods = Object.getOwnPropertyNames(
                DdSdkWrapper.prototype
            ).filter(
                name =>
                    name !== 'constructor' &&
                    !name.startsWith('_') &&
                    typeof Object.getOwnPropertyDescriptor(
                        DdSdkWrapper.prototype,
                        name
                    )?.value === 'function'
            );
            for (const name of methods) {
                nativeModule[name] = jest.fn().mockReturnValue(name);
            }

            for (const name of methods) {
                const arg =
                    name === 'initialize' ? { attributeEncoders: [] } : 'arg';
                expect(sdk[name](arg)).toBe(name);
                expect(nativeModule[name]).toHaveBeenCalledTimes(1);
            }
            expect(methods.length).toBeGreaterThan(15);
        });
    });
});
