import { TurboModuleRegistry } from 'react-native';

describe('./internal entry', () => {
    it('exports the internals react-native-vega needs', () => {
        const internal = require('../internal');
        const expected = [
            'addDefaultValuesToAutoInstrumentationConfiguration',
            'buildConfigurationFromPartialConfiguration',
            'DdSdkNativeConfiguration',
            'RUM_DEFAULTS',
            'adaptLongTaskThreshold',
            'version',
            'AccountInfoSingleton',
            'AttributesSingleton',
            'UserInfoSingleton',
            'GlobalState',
            'BufferSingleton',
            'DatadogProviderState',
            'DdRumResourceTracking'
        ];
        for (const name of expected) {
            expect(internal[name]).toBeDefined();
        }
    });

    it('is import-safe (no native lookup at import)', () => {
        const getSpy = jest.spyOn(TurboModuleRegistry, 'get');
        jest.isolateModules(() => {
            require('../internal');
        });
        expect(getSpy).not.toHaveBeenCalled();
        getSpy.mockRestore();
    });
});
