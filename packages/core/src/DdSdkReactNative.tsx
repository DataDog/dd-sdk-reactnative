/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkReactNativeConfiguration } from "./DdSdkReactNativeConfiguration"
import { DdSdkConfiguration } from "./types"
import { DdSdk } from "./foundation"
import { DdRumUserInteractionTracking } from './rum/instrumentation/DdRumUserInteractionTracking'
import { DdRumErrorTracking } from './rum/instrumentation/DdRumErrorTracking'
import { DdRumResourceTracking } from './rum/instrumentation/DdRumResourceTracking'
import type { TrackingConsent } from "./TrackingConsent"

/**
 * This class initializes the Datadog SDK, and sets up communication with the server.
 */
export class DdSdkReactNative {

    private static readonly DD_SOURCE_KEY = "_dd.source";
    private static readonly DD_SDK_VERBOSITY_KEY = "_dd.sdk_verbosity";

    private static wasInitialized = false

    /**
    * Initializes the Datadog SDK.
    * @param configuration the configuration for the SDK library
    * @returns a Promise.
    */
    static initialize(configuration: DdSdkReactNativeConfiguration): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (DdSdkReactNative.wasInitialized) {
                resolve()
                return
            }

            configuration.additionalConfig[DdSdkReactNative.DD_SOURCE_KEY] = 'react-native';
            if (configuration.verbosity != undefined) {
                configuration.additionalConfig[DdSdkReactNative.DD_SDK_VERBOSITY_KEY] = configuration.verbosity
            }

            DdSdk.initialize(
                new DdSdkConfiguration(
                    configuration.clientToken,
                    configuration.env,
                    configuration.applicationId,
                    configuration.nativeCrashReportEnabled,
                    configuration.sampleRate,
                    configuration.site,
                    configuration.trackingConsent,
                    configuration.additionalConfig
                )
            ).then(() => {
                DdSdkReactNative.enableFeatures(configuration)
                DdSdkReactNative.wasInitialized = true
                resolve()
            }, (rejection) => {
                reject(rejection)
            })
        })
    }

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setAttributes(attributes: object): Promise<void> {
        return DdSdk.setAttributes(attributes)
    }

    /**
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     * @returns a Promise.
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    static setUser(user: object): Promise<void> {
        return DdSdk.setUser(user)
    }

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: One of TrackingConsent values.
     * @returns a Promise.
     */
    static setTrackingConsent(consent: TrackingConsent): Promise<void> {
        return DdSdk.setTrackingConsent(consent)
    }

    private static enableFeatures(configuration: DdSdkReactNativeConfiguration) {
        if (configuration.trackInteractions) {
            DdRumUserInteractionTracking.startTracking();
        }

        if (configuration.trackResources) {
            DdRumResourceTracking.startTracking();
        }

        if (configuration.trackErrors) {
            DdRumErrorTracking.startTracking();
        }
    }
}