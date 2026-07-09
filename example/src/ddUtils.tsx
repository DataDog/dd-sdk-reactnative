import {
    DatadogProviderConfiguration,
    DdLogs,
    DdRum,
    DdSdkReactNative,
    CoreConfiguration,
    SdkVerbosity,
    TrackingConsent,
    BatchSize,
    UploadFrequency,
    DdFlags,
    PropagatorType,
} from '@datadog/mobile-react-native';
import { DatadogOpenFeatureProvider } from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

import {APPLICATION_ID, CLIENT_TOKEN, ENVIRONMENT} from './ddCredentials';
import { BatchProcessingLevel } from '@datadog/mobile-react-native/src/config/types';

// New SDK Setup - not available for react-native-navigation
export function getDatadogConfig(trackingConsent: TrackingConsent) {
    const config = new DatadogProviderConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        trackingConsent,
        {
            batchSize: BatchSize.SMALL,
            uploadFrequency: UploadFrequency.FREQUENT,
            batchProcessingLevel: BatchProcessingLevel.MEDIUM,
            additionalConfiguration: {
                customProperty: "sdk-example-app"
            },
            rumConfiguration: {
                applicationId: APPLICATION_ID,
                trackInteractions: true,
                trackResources: true,
                trackErrors: true,
                sessionSampleRate: 100,
                nativeCrashReportEnabled: true,
                firstPartyHosts: [{
                    match: "example.com",
                    propagatorTypes: [PropagatorType.B3MULTI, PropagatorType.TRACECONTEXT]
                }]
            },
            logsConfiguration: {
                logEventMapper: (logEvent) => {
                    logEvent.message = `[CUSTOM] ${logEvent.message}`;
                    return logEvent;
                }
            },
            traceConfiguration: {}
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

    setTimeout(async () => {
        await DdRum.reportAppFullyDisplayed();
    }, 5000);
}

// Legacy SDK Setup
export function initializeDatadog(trackingConsent: TrackingConsent) {

    const config = new CoreConfiguration(
        CLIENT_TOKEN,
        ENVIRONMENT,
        trackingConsent,
        {
            rumConfiguration: {
                applicationId: APPLICATION_ID,
                trackInteractions: true,
                trackResources: true,
                trackErrors: true,
                sessionSampleRate: 100,
                nativeCrashReportEnabled: true,
                firstPartyHosts: [{
                    match: "example.com",
                    propagatorTypes: [PropagatorType.B3MULTI, PropagatorType.TRACECONTEXT]
                }]
            }
        }
    )

    config.verbosity = SdkVerbosity.DEBUG;
    config.service = "com.datadoghq.reactnative.sample"

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized')
        DdSdkReactNative.setUserInfo({id: "1337", name: "Xavier", email: "xg@example.com", extraInfo: { type: "premium" } })
        DdSdkReactNative.addAttributes({campaign: "ad-network"})

        setTimeout(async () => {
            await DdRum.reportAppFullyDisplayed();
        }, 5000);
    });

    // Enable the Flags feature.
    DdFlags.enable().then(() => {
        // Set the provider with OpenFeature.
        const provider = new DatadogOpenFeatureProvider();
        OpenFeature.setProvider(provider);
    })
}
