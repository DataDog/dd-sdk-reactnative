/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdSdkNativeConfiguration } from '../config/features/CoreConfigurationNative';
import type { DdNativeSdkType } from '../nativeModulesTypes';

import type { AttributeEncoder } from './AttributesEncoding/types';

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const NativeDdSdk: DdNativeSdkType = require('../specs/NativeDdSdk').default;

export type DdSdkType = {
    readonly attributeEncoders: AttributeEncoder<any>[];

    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdSdkNativeConfiguration): Promise<void>;

    configurationFromString(wire: string): Promise<object>;

    configurationToString(configuration: object): Promise<string>;

    fetchRulesConfiguration(options: object): Promise<object>;

    fetchPrecomputedConfiguration(options: object): Promise<object>;

    saveConfiguration(configuration: object, options: object): Promise<object>;

    loadConfiguration(options: object): Promise<object>;

    setConfiguration(configuration: object): Promise<object>;

    setEvaluationContext(context: object): Promise<object>;

    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean
    ): Promise<object>;

    resolveStringEvaluation(
        flagKey: string,
        defaultValue: string
    ): Promise<object>;

    resolveNumberEvaluation(
        flagKey: string,
        defaultValue: number
    ): Promise<object>;

    resolveObjectEvaluation(
        flagKey: string,
        defaultValue: object
    ): Promise<object>;

    getProviderDebugState(): Promise<object>;
};

export class DdSdkWrapper implements DdNativeSdkType {
    get attributeEncoders(): AttributeEncoder<any>[] {
        return this._attributeEncoders;
    }
    private _attributeEncoders: AttributeEncoder<any>[] = [];

    initialize(configuration: DdSdkNativeConfiguration): Promise<void> {
        this._attributeEncoders = [...configuration.attributeEncoders];
        return NativeDdSdk.initialize(configuration);
    }

    getConstants() {
        return NativeDdSdk.getConstants();
    }

    setUserInfo(user: object): Promise<object> {
        return NativeDdSdk.setUserInfo(user);
    }

    clearUserInfo(): Promise<void> {
        return NativeDdSdk.clearUserInfo();
    }

    addUserExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdk.addUserExtraInfo(extraInfo);
    }

    addAttribute(key: string, value: object): Promise<void> {
        return NativeDdSdk.addAttribute(key, value);
    }
    removeAttribute(key: string): Promise<void> {
        return NativeDdSdk.removeAttribute(key);
    }
    addAttributes(attributes: object): Promise<void> {
        return NativeDdSdk.addAttributes(attributes);
    }
    removeAttributes(keys: string[]): Promise<void> {
        return NativeDdSdk.removeAttributes(keys);
    }
    setAccountInfo(account: object): Promise<object> {
        return NativeDdSdk.setAccountInfo(account);
    }
    clearAccountInfo(): Promise<void> {
        return NativeDdSdk.clearAccountInfo();
    }
    addAccountExtraInfo(extraInfo: object): Promise<object> {
        return NativeDdSdk.addAccountExtraInfo(extraInfo);
    }

    setTrackingConsent(trackingConsent: string): Promise<void> {
        return NativeDdSdk.setTrackingConsent(trackingConsent);
    }

    sendTelemetryLog(
        message: string,
        attributes: object,
        config: object
    ): Promise<void> {
        return NativeDdSdk.sendTelemetryLog(message, attributes, config);
    }

    telemetryDebug(message: string): Promise<void> {
        return NativeDdSdk.telemetryDebug(message);
    }

    telemetryError(
        message: string,
        stack: string,
        kind: string
    ): Promise<void> {
        return NativeDdSdk.telemetryError(message, stack, kind);
    }

    consumeWebviewEvent(message: string): Promise<void> {
        return NativeDdSdk.consumeWebviewEvent(message);
    }

    clearAllData(): Promise<void> {
        return NativeDdSdk.clearAllData();
    }

    configurationFromString(wire: string): Promise<object> {
        return NativeDdSdk.configurationFromString(wire);
    }

    configurationToString(configuration: object): Promise<string> {
        return NativeDdSdk.configurationToString(configuration);
    }

    fetchRulesConfiguration(options: object): Promise<object> {
        return NativeDdSdk.fetchRulesConfiguration(options);
    }

    fetchPrecomputedConfiguration(options: object): Promise<object> {
        return NativeDdSdk.fetchPrecomputedConfiguration(options);
    }

    saveConfiguration(configuration: object, options: object): Promise<object> {
        return NativeDdSdk.saveConfiguration(configuration, options);
    }

    loadConfiguration(options: object): Promise<object> {
        return NativeDdSdk.loadConfiguration(options);
    }

    setConfiguration(configuration: object): Promise<object> {
        return NativeDdSdk.setConfiguration(configuration);
    }

    setEvaluationContext(context: object): Promise<object> {
        return NativeDdSdk.setEvaluationContext(context);
    }

    resolveBooleanEvaluation(
        flagKey: string,
        defaultValue: boolean
    ): Promise<object> {
        return NativeDdSdk.resolveBooleanEvaluation(flagKey, defaultValue);
    }

    resolveStringEvaluation(
        flagKey: string,
        defaultValue: string
    ): Promise<object> {
        return NativeDdSdk.resolveStringEvaluation(flagKey, defaultValue);
    }

    resolveNumberEvaluation(
        flagKey: string,
        defaultValue: number
    ): Promise<object> {
        return NativeDdSdk.resolveNumberEvaluation(flagKey, defaultValue);
    }

    resolveObjectEvaluation(
        flagKey: string,
        defaultValue: object
    ): Promise<object> {
        return NativeDdSdk.resolveObjectEvaluation(flagKey, defaultValue);
    }

    getProviderDebugState(): Promise<object> {
        return NativeDdSdk.getProviderDebugState();
    }

    addListener(eventType: string): void {
        return NativeDdSdk.addListener(eventType);
    }

    removeListeners(count: number): void {
        return NativeDdSdk.removeListeners(count);
    }

    _setAttributeEncodersForTesting(
        attributeEncoders: AttributeEncoder<any>[]
    ) {
        this._attributeEncoders = [...attributeEncoders];
    }
}

export { NativeDdSdk };
