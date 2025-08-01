import {
    DatadogProviderConfiguration,
    DdLogs,
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    SdkVerbosity,
    TrackingConsent
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

    return config
}

 export async function onDatadogInitialization() {

    console.log("Datadog SDK was initialized, initializing Logs...");
    await DdLogs.enable({});
    DdLogs.debug('DDLogs was initialized');
    DdSdkReactNative.setUserInfo({id: "w00t", name: "Sergio", email: "modular@sdk.com", extraInfo: { type: "premium" } })
    setTimeout(async () => {
        await DdLogs.enable({
            customEndpoints: {
                logs: "custom.endpoint"
            }
        });
        DdLogs.debug('DDLogs was initialized again with a custom endpoint');

        setTimeout(async () => {
            await DdLogs.enable({});
            DdLogs.debug('DDLogs was initialized for the third time');
        }, 20000);
    }, 20000);
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

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
        DdSdkReactNative.setAttributes({campaign: "ad-network"})
    });
}
