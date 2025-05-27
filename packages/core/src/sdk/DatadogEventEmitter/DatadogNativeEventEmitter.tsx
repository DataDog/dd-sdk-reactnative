/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeEventEmitter, Platform } from 'react-native';
import type { NativeModule } from 'react-native';

import type {
    DatadogEventEmitterCallback,
    DatadogEventEmitter
} from './DatadogEventEmitter';

export class DatadogNativeEventEmitter implements DatadogEventEmitter {
    private nativeEventEmitter?: NativeEventEmitter;
    private nativeModule?: NativeModule;
    private errorHandler: (err: any) => void;

    constructor(
        nativeModule: NativeModule | undefined,
        errorHandler: (err: any) => void
    ) {
        this.nativeModule = nativeModule;
        this.errorHandler = errorHandler;
    }

    initialize(): boolean {
        try {
            if (Platform.OS === 'ios') {
                if (!this.nativeModule) {
                    this.errorHandler(
                        'ERROR: Initializing iOS Native Event Emitter with undefined NativeModule.'
                    );
                }
                this.nativeEventEmitter = new NativeEventEmitter(
                    this.nativeModule
                );
            } else {
                this.nativeEventEmitter = new NativeEventEmitter();
            }
            return true;
        } catch (err) {
            this.errorHandler(
                `ERROR: cannot initialize NativeEventEmitter: ${err}`
            );
            return false;
        }
    }

    addListener(
        eventName: string,
        callback: DatadogEventEmitterCallback
    ): void {
        this.nativeEventEmitter?.addListener(eventName, callback);
    }

    removeAllListeners(eventName: string): void {
        this.nativeEventEmitter?.removeAllListeners(eventName);
    }
}
