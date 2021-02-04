import type { DdRNSdkConfiguration } from "./configuration"
import { DdSdkConfiguration, DdSdkType } from "./types"
import { NativeModules } from 'react-native'
import { DdRumUserInteractionTracking } from './rum/instrumentation/DdRumUserInteractionTracking'

const DdSdk: DdSdkType = NativeModules.DdSdk;

/**
 * This class initializes the Datadog SDK, and sets up communication with the server.
 */
export class Datadog {
    private static wasInitialized = false

    /**
    * Initializes the Datadog SDK.
    * @param configuration the configuration for the SDK library
    * @returns a Promise.
    */
    static initialize(configuration: DdRNSdkConfiguration): Promise<void> {
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

    private static enableFeatures(configuration: DdRNSdkConfiguration) {
        if (configuration.trackInteractions) {
            DdRumUserInteractionTracking.startTracking()
        }
    }
}