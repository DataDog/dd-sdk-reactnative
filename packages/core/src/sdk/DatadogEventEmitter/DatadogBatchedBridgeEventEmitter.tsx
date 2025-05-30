/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    DatadogEventEmitterCallback,
    DatadogEventEmitter
} from './DatadogEventEmitter';

export class DatadogBatchedBridgeEventEmitter implements DatadogEventEmitter {
    private listeners: Record<string, DatadogEventEmitterCallback>;
    private errorHandler: (err: any) => void;

    constructor(errorHandler: (err: any) => void) {
        this.errorHandler = errorHandler;
        this.listeners = {};
    }

    initialize(): boolean {
        try {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const BatchedBridge = require('react-native/Libraries/BatchedBridge/BatchedBridge');
            const batchedBridge = BatchedBridge.default ?? BatchedBridge;
            batchedBridge.registerCallableModule(
                'DatadogInternalReactBridge',
                this
            );

            return true;
        } catch (err) {
            this.errorHandler(`ERROR: cannot initialize BatchedBridge: ${err}`);
            return false;
        }
    }

    addListener(
        eventName: string,
        callback: DatadogEventEmitterCallback
    ): void {
        this.listeners[eventName] = callback;
    }

    removeAllListeners(eventName: string): void {
        delete this.listeners[eventName];
    }

    // Called directly from native layer.
    __datadogOnMessageReceived(eventName: string, data: any): void {
        const callback = this.listeners[eventName];
        if (!callback) {
            this.errorHandler(
                `ERROR: No listeners registered for received event ${eventName} with data: ${JSON.stringify(
                    data,
                    null,
                    4
                )}`
            );
            return;
        }

        callback(data);
    }
}
