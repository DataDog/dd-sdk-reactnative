module.exports = {
    dependency: {
        platforms: {
            kepler: {
                autolink: {
                    'com.datadog.reactnative.vega': {
                        libraryName: 'libDatadogVega.so',
                        provider: 'application',
                        linkDynamic: true,
                        turbomodules: ['DdSdk', 'DdRum', 'DdLogs']
                    },
                    // The app-version provider is transitive. Load its system
                    // TurboModule without requiring an app-level dependency.
                    DeviceInfoLib: {
                        provider: 'system',
                        libraryName: 'libkeplerscript-deviceinfo-lib-10.so.10',
                        linkDynamic: true,
                        turbomodules: ['DeviceInfoModule']
                    }
                }
            }
        }
    }
};
