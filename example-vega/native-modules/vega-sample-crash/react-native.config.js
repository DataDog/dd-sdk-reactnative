module.exports = {
  dependency: {
    platforms: {
      kepler: {
        autolink: {
          'com.datadog.example.vega.nativecrash': {
            libraryName: 'libVegaSampleCrash.so',
            provider: 'application',
            linkDynamic: true,
            turbomodules: ['VegaSampleCrash'],
          },
        },
      },
    },
  },
};
