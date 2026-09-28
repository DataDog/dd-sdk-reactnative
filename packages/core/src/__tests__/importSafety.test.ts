import { TurboModuleRegistry } from 'react-native';

describe('native spec modules are import-safe (lazy)', () => {
    const cases: Array<[string, string, string]> = [
        ['../specs/NativeDdSdk', 'getNativeDdSdk', 'DdSdk'],
        ['../specs/NativeDdRum', 'getNativeDdRum', 'DdRum'],
        ['../specs/NativeDdLogs', 'getNativeDdLogs', 'DdLogs'],
        ['../specs/NativeDdTrace', 'getNativeDdTrace', 'DdTrace'],
        ['../specs/NativeDdFlags', 'getNativeDdFlags', 'DdFlags']
    ];

    it.each(cases)(
        '%s does not resolve native at import but does on getter call',
        (modulePath, getterName, registryName) => {
            const getSpy = jest.spyOn(TurboModuleRegistry, 'get');
            let mod: any;
            jest.isolateModules(() => {
                mod = require(modulePath);
            });
            expect(getSpy).not.toHaveBeenCalled(); // not at import
            mod[getterName]();
            expect(getSpy).toHaveBeenCalledWith(registryName); // only on use
            getSpy.mockRestore();
        }
    );
});

describe('DdSdkInternal is import-safe', () => {
    it('importing DdSdkInternal does not resolve native until a method is used', () => {
        const getSpy = jest.spyOn(TurboModuleRegistry, 'get');
        let internal: any;
        jest.isolateModules(() => {
            internal = require('../sdk/DdSdkInternal');
        });
        expect(getSpy).not.toHaveBeenCalled(); // import-safe
        // Touch a property on the proxy -> now it resolves
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        internal.NativeDdSdk.getConstants;
        expect(getSpy).toHaveBeenCalledWith('DdSdk');
        getSpy.mockRestore();
    });
});

describe('public barrel is import-safe', () => {
    it('importing the package index performs no native TurboModule lookup', () => {
        const getSpy = jest.spyOn(TurboModuleRegistry, 'get');
        jest.isolateModules(() => {
            require('../index');
        });
        expect(getSpy).not.toHaveBeenCalled();
        getSpy.mockRestore();
    });
});
