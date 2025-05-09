/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import NativeDdSdk from '../../specs/NativeDdSdk';

import type { DdSdkNativeBridgeSpec } from './DdSdkNativeBridgeSpec';

let _hasNativeBridge = false;

type ErrorHandler = (err: any) => void;
const noOpErrorHandler: ErrorHandler = (_: any) => {
    /* empty */
};
export const registerNativeBridge = (
    bridge: DdSdkNativeBridgeSpec,
    errorHandler: ErrorHandler = noOpErrorHandler
) => {
    try {
        const globalThis = global as any;
        if (globalThis.RN$Bridgeless) {
            registerNewArchitectureBridge(bridge);
        } else {
            registerOldArchitectureBridge(bridge);
        }

        _hasNativeBridge = true;
    } catch (err) {
        errorHandler(err);
    }
};

function registerNewArchitectureBridge(bridge: DdSdkNativeBridgeSpec) {
    const nativeDdSdk = NativeDdSdk;
    if (!nativeDdSdk) {
        throw new Error(
            'registerNativeBridge() ERROR: NativeDdSdk is undefined'
        );
    }

    // Register Turbo Module Event Listeners here
    nativeDdSdk.onRUMSessionStarted(bridge.__datadogRumSessionStarted);
}

function registerOldArchitectureBridge(internalBridge: DdSdkNativeBridgeSpec) {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const batchedBridge = require('react-native/Libraries/BatchedBridge/BatchedBridge');
    batchedBridge.registerCallableModule(
        'DatadogInternalReactBridge',
        internalBridge
    );
}

export const hasNativeBridge = () => _hasNativeBridge;
