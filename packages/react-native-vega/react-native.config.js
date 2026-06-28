module.exports = {
    dependency: {
        platforms: {
            kepler: {
                autolink: {
                    'com.datadog.reactnative.vega': {
                        libraryName: 'libDatadogVega.so',
                        provider: 'application',
                        linkDynamic: true,
                        turbomodules: ['DdSdk', 'DdRum']
                    }
                }
            }
        }
    }
};
