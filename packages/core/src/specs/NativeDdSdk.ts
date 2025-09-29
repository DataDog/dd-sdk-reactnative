/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Do not import this Spec directly, use DdNativeSdkType instead.
 */

export type RumSessionStartedEvent = {
    sessionId: string | null;
};

export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: Object): Promise<void>;

    /**
     * Adds a specific attribute to the global context attached with all future Logs, Spans and RUM.
     * @param key: Key that identifies the attribute.
     * @param value: Value linked to the attribute.
     */
    addAttribute(key: string, value: Object): Promise<void>;

    /**
     * Removes an attribute from the context attached with all future Logs, Spans and RUM events.
     * @param key: They key associated with the attribute to be removed.
     */
    removeAttribute(key: string): Promise<void>;

    /**
     * Adds the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     */
    addAttributes(attributes: Object): Promise<void>;

    /**
     * Removes a set of attributes from the context attached with all future Logs, Spans and RUM events.
     * @param keys: They keys associated with the attributes to be removed.
     */
    removeAttributes(keys: string[]): Promise<void>;

    /**
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and any custom attribute under extraInfo).
     */
    setUserInfo(user: Object): Promise<Object>;

    /**
     * Clears the user information.
     */
    clearUserInfo(): Promise<void>;

    /**
     * Add custom attributes  to the current user information
     * @param extraInfo: The extraInfo object containing additionall custom attributes
     */
    addUserExtraInfo(extraInfo: Object): Promise<Object>;

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    setTrackingConsent(trackingConsent: string): Promise<void>;

    /**
     * Sends internal telemetry message with attributes
     * @param message message
     * @param attributes attributes
     */
    sendTelemetryLog(
        message: string,
        attributes: Object,
        config: Object
    ): Promise<void>;

    /**
     * Sends internal telemetry debug message
     * @param message debug message
     */
    telemetryDebug(message: string): Promise<void>;

    /**
     * Sends internal telemetry error
     * @param message error message
     * @param stack error stack
     * @param kind error kind
     */
    telemetryError(message: string, stack: string, kind: string): Promise<void>;

    /**
     * Send webview telemetry logs
     * @param message event description
     */
    consumeWebviewEvent(message: string): Promise<void>;

    /**
     * Clears all data that has not already been sent to Datadog servers
     */
    clearAllData(): Promise<void>;

    /**
     * Required definitions, because of:
     * https://github.com/react-native-community/RNNewArchitectureLibraries/tree/feat/swift-event-emitter?tab=readme-ov-file#codegen-update-codegen-specs)
     */
    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdSdk');
