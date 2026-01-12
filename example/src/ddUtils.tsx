import {
    DatadogProviderConfiguration,
    DdLogs,
    DdSdkReactNative,
    CoreConfiguration,
    RumConfiguration,
    SdkVerbosity,
    TrackingConsent,
    DdFlags,
} from '@datadog/mobile-react-native';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';

// New SDK Setup - not available for react-native-navigation
export function getDatadogConfig(trackingConsent: TrackingConsent) {
    const config = new DatadogProviderConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        trackingConsent,
    );

    config.service = "com.datadoghq.reactnative.sample"
    config.nativeCrashReportEnabled = true
    config.verbosity = SdkVerbosity.DEBUG;
    config.rumConfiguration = new RumConfiguration(APPLICATION_ID, true, true, true);
    config.rumConfiguration.sessionSampleRate = 100
    return config
}

 export function onDatadogInitialization() {
    DdLogs.info('The RN Sdk was properly initialized')
    DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
    DdSdkReactNative.addAttributes({campaign: "ad-network"})
}

// Legacy SDK Setup
export function initializeDatadog(trackingConsent: TrackingConsent) {

    const config = new CoreConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        trackingConsent
    )
    config.nativeCrashReportEnabled = true
    config.verbosity = SdkVerbosity.DEBUG;
    config.service = "com.datadoghq.reactnative.sample"
    config.rumConfiguration = new RumConfiguration(APPLICATION_ID, true, true, true);
    config.rumConfiguration.sessionSampleRate = 100

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
        DdSdkReactNative.addAttributes({campaign: "ad-network"})
    });

    DdFlags.enable()
}
