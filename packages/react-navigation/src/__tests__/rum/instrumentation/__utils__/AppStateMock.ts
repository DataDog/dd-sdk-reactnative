/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

type handler = (value: string) => void;

export class AppStateMock {
    private handlers: { [eventType: string]: handler[] } = {};

    addEventListener = (type: string, callback: handler) => {
        if (!this.handlers[type]) {
            this.handlers[type] = [];
        }
        this.handlers[type].push(callback);
    };

    removeEventListener = (type: string, callback: handler) => {
        if (!this.handlers[type]) {
            return;
        }
        const callbackIndex = this.handlers[type].indexOf(callback);
        if (callbackIndex === -1) {
            return;
        }
        this.handlers[type] = [
            ...this.handlers[type].slice(0, callbackIndex),
            ...this.handlers[type].slice(
                callbackIndex + 1,
                this.handlers[type].length
            )
        ];
    };

    changeValue = (value: string) => {
        if (!this.handlers.change) {
            return;
        }
        this.handlers.change.forEach(callback => {
            try {
                callback(value);
            } catch (e) {
                console.warn(
                    `Failure while executing callback for value ${value}`
                );
            }
        });
    };

    removeAllListeners = () => {
        this.handlers = {};
    };
}
