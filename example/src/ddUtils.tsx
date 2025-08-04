import {
    DatadogProviderConfiguration,
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    SdkVerbosity,
    TrackingConsent
} from '@datadog/mobile-react-native';

import {
    DdLogs,
} from '@datadog/mobile-react-native-logs';

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

    try {
        console.log("Datadog SDK was initialized, initializing Logs...");
        await DdLogs.enable({});
        console.log('DDLogs was initialized');
        DdLogs.debug('DDLogs was initialized');
        DdSdkReactNative.setUserInfo({id: "w00t", name: "Sergio", email: "modular@sdk.com", extraInfo: { type: "premium" } })
        setTimeout(async () => {
            console.log("Initialize ddlogs again");
            await DdLogs.enable({
                customEndpoints: {
                    logs: "custom.endpoint"
                }
            });
            console.log('DDLogs was initialized again with a custom endpoint');
            DdLogs.debug('DDLogs was initialized again with a custom endpoint');

            setTimeout(async () => {
                console.log("Initialize ddlogs for a third time");
                await DdLogs.enable({});
                console.log('DDLogs was initialized for the third time');
                DdLogs.debug('DDLogs was initialized for the third time');
            }, 5000);
        }, 5000);
    } catch (error) {
        console.log("ERROR during init", error);
    }
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
