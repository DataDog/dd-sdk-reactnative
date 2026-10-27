describe('./internal entry', () => {
    it('exports the internals react-native-vega needs', () => {
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
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

    // Import safety of this entry point is covered in wrapperImportSafety.test.ts.
});
