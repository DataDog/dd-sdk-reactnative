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
export interface Spec extends TurboModule {
    readonly getConstants: () => {};

    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: Object): Promise<void>;

    /**
     * Sets the global context (set of attributes) attached with all future Logs, Spans and RUM events.
     * @param attributes: The global context attributes.
     */
    setAttributes(attributes: Object): Promise<void>;

    /**
     * Set the user information.
     * @param user: The user object (use builtin attributes: 'id', 'email', 'name', and/or any custom attribute).
     */
    setUser(user: Object): Promise<Object>;

    /**
     * Set the tracking consent regarding the data collection.
     * @param trackingConsent: Consent, which can take one of the following values: 'pending', 'granted', 'not_granted'.
     */
    setTrackingConsent(trackingConsent: string): Promise<void>;

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
}

export default TurboModuleRegistry.get<Spec>('DdSdk');
