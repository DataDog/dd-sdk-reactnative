/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    DdNativeSdkConfiguration,
    DdNativeSdkType
} from '../nativeModulesTypes';

import type { AttributeEncoder } from './AttributesEncoding/types';

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const NativeDdSdk: DdNativeSdkType = require('../specs/NativeDdSdk').default;

export type DdSdkType = {
    readonly attributeEncoders: AttributeEncoder<any>[];

    /**
     * Initializes Datadog's features.
     * @param configuration: The configuration to use.
     */
    initialize(configuration: DdNativeSdkConfiguration): Promise<void>;
};

export class DdSdkWrapper implements DdNativeSdkType {
    get attributeEncoders(): AttributeEncoder<any>[] {
        return this._attributeEncoders;
    }
    private _attributeEncoders: AttributeEncoder<any>[] = [];

    initialize(configuration: DdNativeSdkConfiguration): Promise<void> {
        this._attributeEncoders = [...configuration.attributeEncoders];
        return NativeDdSdk.initialize(configuration);
    }

    getConstants() {
        return NativeDdSdk.getConstants();
    }

    setAttributes(attributes: object): Promise<void> {
        return NativeDdSdk.setAttributes(attributes);
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
