/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AppStateEvent, AppStateStatus } from 'react-native';

type handler = (type: AppStateStatus) => void;

/**
 * This is a mock of legacy implementation of AppState (up until RN 0.65).
 * In the new version, removeEventListener has been deprecated and addEventListener
 * now returns a subscription.
 */
export class AppStateMockLegacy {
    private handlers: { [eventType: string]: handler[] } = {};

    addEventListener = (type: AppStateEvent, callback: handler) => {
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

    changeValue = (value: AppStateStatus) => {
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
