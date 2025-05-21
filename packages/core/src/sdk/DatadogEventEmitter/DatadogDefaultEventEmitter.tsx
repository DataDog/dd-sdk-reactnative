/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeModules } from 'react-native';

import { DatadogBatchedBridgeEventEmitter } from './DatadogBatchedBridgeEventEmitter';
import type { DatadogEventEmitter } from './DatadogEventEmitter';
import { DatadogNativeEventEmitter } from './DatadogNativeEventEmitter';

export class DatadogDefaultEventEmitter implements DatadogEventEmitter {
    private eventEmitter?: DatadogEventEmitter;

    private get isNewArchitecture(): boolean {
        return (global as any).RN$Bridgeless;
    }

    constructor(errorHandler: (err: any) => void) {
        try {
            const ddSdkModule =
                NativeModules.DdSdk ||
                // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
                require('../../specs/NativeDdSdk').default;
            this.eventEmitter = this.isNewArchitecture
                ? new DatadogNativeEventEmitter(ddSdkModule, errorHandler)
                : new DatadogBatchedBridgeEventEmitter(errorHandler);
        } catch (err) {
            errorHandler(
                `ERROR: failed to initialize DatadogDefaultEventEmitter: ${err}`
            );
        }
    }

    initialize(): boolean {
        return this.eventEmitter?.initialize() ?? false;
    }

    public addListener(eventName: string, callback: (data: any) => void) {
        this.eventEmitter?.addListener(eventName, callback);
    }

    public removeAllListeners(eventName: string) {
        this.eventEmitter?.removeAllListeners(eventName);
    }
}
