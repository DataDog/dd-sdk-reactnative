import type { DdSdkReactNativeConfiguration } from "./configuration"
import { DdSdkConfiguration, DdSdkType } from "./types"
import { NativeModules } from 'react-native'
import { DdRumUserInteractionTracking } from './rum/instrumentation/DdRumUserInteractionTracking'

const DdSdk: DdSdkType = NativeModules.DdSdk;

/**
 * This class initializes the Datadog SDK, and sets up communication with the server.
 */
export class DdSdkReactNative {
    private static wasInitialized = false

    /**
    * Initializes the Datadog SDK.
    * @param configuration the configuration for the SDK library
    * @returns a Promise.
    */
    static initialize(configuration: DdSdkReactNativeConfiguration): Promise<void> {
        return new Promise<void>((resolve => {
            if (this.wasInitialized) {
                resolve()
                return
            }
            DdSdk.initialize(new DdSdkConfiguration(configuration.clientToken, configuration.env, configuration.applicationId))
            this.enableFeatures(configuration)
            this.wasInitialized = true
            resolve()
        }))

    }

    private static enableFeatures(configuration: DdSdkReactNativeConfiguration) {
        if (configuration.trackInteractions) {
            DdRumUserInteractionTracking.startTracking()
        }
    }
}