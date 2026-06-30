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
     * Set the account information.
     * @param account: The account object (use builtin attributes: 'id', 'name', and any custom attribute under extraInfo).
     */
    setAccountInfo(account: Object): Promise<Object>;

    /**
     * Clears the account information.
     */
    clearAccountInfo(): Promise<void>;

    /**
     * Add custom attributes to the current account information
     * @param extraInfo: The extraInfo object containing additional custom attributes
     */
    addAccountExtraInfo(extraInfo: Object): Promise<Object>;

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
     * Parses a portable flags configuration wire string into an opaque native
     * configuration object.
     */
    configurationFromString(wire: string): Promise<Object>;

    /**
     * Serializes an opaque native flags configuration object into a portable
     * configuration wire string.
     */
    configurationToString(configuration: Object): Promise<string>;

    /**
     * Sets or replaces the active native flags configuration.
     */
    setConfiguration(configuration: Object): Promise<Object>;

    /**
     * Stores the current evaluation context for subsequent evaluations.
     */
    setEvaluationContext(context: Object): Promise<Object>;

    /**
     * Resolves a boolean feature flag evaluation against the active native
     * configuration and current evaluation context.
     */
    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean
    ): Promise<Object>;

    /**
     * Resolves a string feature flag evaluation against the active native
     * configuration and current evaluation context.
     */
    resolveStringEvaluation(
        flagKey: string,
        defaultValue: string
    ): Promise<Object>;

    /**
     * Resolves a number feature flag evaluation against the active native
     * configuration and current evaluation context.
     */
    resolveNumberEvaluation(
        flagKey: string,
        defaultValue: number
    ): Promise<Object>;

    /**
     * Resolves an object feature flag evaluation against the active native
     * configuration and current evaluation context.
     */
    resolveObjectEvaluation(
        flagKey: string,
        defaultValue: Object
    ): Promise<Object>;

    /**
     * Returns debug-only provider state for validating the RN-local native
     * implementation.
     */
    getProviderDebugState(): Promise<Object>;

    /**
     * Required definitions, because of:
     * https://github.com/react-native-community/RNNewArchitectureLibraries/tree/feat/swift-event-emitter?tab=readme-ov-file#codegen-update-codegen-specs)
     */
    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;
}

// eslint-disable-next-line import/no-default-export
export default TurboModuleRegistry.get<Spec>('DdSdk');
