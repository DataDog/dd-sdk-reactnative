import {
    DatadogProviderConfiguration,
    DdLogs,
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    SdkVerbosity,
    TrackingConsent,
    DatadogFlags,
    type DatadogFlagsConfiguration,
} from '@datadog/mobile-react-native';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';

// New SDK Setup - not available for react-native-navigation
export function getDatadogConfig(trackingConsent: TrackingConsent) {
    const config = new DatadogProviderConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        APPLICATION_ID,
        true,
        true,
        true,
        trackingConsent
    )
    config.nativeCrashReportEnabled = true
    config.sessionSamplingRate = 100
    config.serviceName = "com.datadoghq.reactnative.sample"
    config.verbosity = SdkVerbosity.DEBUG;

    const flagsConfiguration: DatadogFlagsConfiguration = {
        enabled: true,
    }
    config.flagsConfiguration = flagsConfiguration

    return config
}

 export function onDatadogInitialization() {
    DdLogs.info('The RN Sdk was properly initialized')
    DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
    DdSdkReactNative.addAttributes({campaign: "ad-network"})
}

// Legacy SDK Setup
export function initializeDatadog(trackingConsent: TrackingConsent) {

    const config = new DdSdkReactNativeConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        APPLICATION_ID,
        true,
        true,
        true,
        trackingConsent
    )
    config.nativeCrashReportEnabled = true
    config.sampleRate = 100
    config.serviceName = "com.datadoghq.reactnative.sample"
    config.verbosity = SdkVerbosity.DEBUG;

    const flagsConfiguration: DatadogFlagsConfiguration = {
        enabled: true,
    }
    config.flagsConfiguration = flagsConfiguration

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
        DdSdkReactNative.addAttributes({campaign: "ad-network"})
    });

    DatadogFlags.enable(flagsConfiguration)
}
