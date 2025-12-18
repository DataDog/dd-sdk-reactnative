import {
    DatadogProviderConfiguration,
    DdLogs,
    DdSdkReactNative,
    CoreConfiguration,
    RumConfiguration,
    SdkVerbosity,
    TrackingConsent
} from '@datadog/mobile-react-native';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';

// New SDK Setup - not available for react-native-navigation
export function getDatadogConfig(trackingConsent: TrackingConsent) {
    const config = new DatadogProviderConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        trackingConsent,
        {
            applicationId: APPLICATION_ID,
            trackInteractions: true,
            trackResources: true,
            trackErrors: true,
            sessionSampleRate: 100,
            nativeCrashReportEnabled: true
        }
    );

    config.service = "com.datadoghq.reactnative.sample"
    config.verbosity = SdkVerbosity.DEBUG;
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
        trackingConsent,
        {
            applicationId: APPLICATION_ID,
            trackInteractions: true,
            trackResources: true,
            trackErrors: true,
            sessionSampleRate: 100,
            nativeCrashReportEnabled: true
        }
    )
    config.verbosity = SdkVerbosity.DEBUG;
    config.service = "com.datadoghq.reactnative.sample"

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
        DdSdkReactNative.addAttributes({campaign: "ad-network"})
    });
}
