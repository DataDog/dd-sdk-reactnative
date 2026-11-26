/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    DdSdkReactNative as CoreSdk,
    InternalLog,
    SdkVerbosity
} from '@datadog/mobile-react-native';
import type {
    CoreConfiguration,
    TrackingConsent
} from '@datadog/mobile-react-native';

import { registerVegaBridge } from './CoreBridge';

export const withVegaBridge = async (
    operation: () => Promise<void>
): Promise<void> => {
    try {
        registerVegaBridge();
        await operation();
    } catch {
        InternalLog.log(
            'Datadog Vega setup failed; the app can continue running',
            SdkVerbosity.WARN
        );
    }
};

/** Uses the shared setup paths and configuration options with the Kepler bridge. */
export class VegaSdk {
    static initialize = (configuration: CoreConfiguration): Promise<void> =>
        withVegaBridge(() => CoreSdk.initialize(configuration));
    static setTrackingConsent = (consent: TrackingConsent): Promise<void> =>
        withVegaBridge(() => CoreSdk.setTrackingConsent(consent));
    static clearAllData = (): Promise<void> =>
        withVegaBridge(() => CoreSdk.clearAllData());
}
