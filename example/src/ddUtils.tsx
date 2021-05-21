import {
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    DdLogs,
    TrackingConsent
} from 'dd-sdk-reactnative';

import { CLIENT_TOKEN, ENVIRONMENT, APPLICATION_ID } from './ddCredentials';
import { getTrackingConsent } from './utils';

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

    DdSdkReactNative.initialize(config).then(() => {
        DdLogs.info('The RN Sdk was properly initialized', {})
        DdSdkReactNative.setUser({id: "1337", name: "Xavier", email: "xg@example.com", type: "premium"})
        DdSdkReactNative.setAttributes({campaign: "ad-network"})
    });
}