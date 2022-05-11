import {
    DdLogs,
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    SdkVerbosity,
    TrackingConsent
} from '@datadog/mobile-react-native';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';

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

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUser({id: "1337", name: "Xavier", email: "xg@example.com", type: "premium"})
        DdSdkReactNative.setAttributes({campaign: "ad-network"})
    });
}