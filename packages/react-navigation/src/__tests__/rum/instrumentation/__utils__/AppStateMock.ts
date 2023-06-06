/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    AppStateEvent,
    AppStateStatus,
    NativeEventSubscription
} from 'react-native';
import { AppState } from 'react-native';

type handler = (type: AppStateStatus) => void;

export class AppStateMock {
    private listeners: {
        [eventType: string]: {
            callback: handler;
            subscription: NativeEventSubscription;
        }[];
    } = {};

    addEventListener = (type: AppStateEvent, callback: handler) => {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        const subscription = {
            remove: () => this.removeListeners(type, callback)
        };
        this.listeners[type].push({
            callback,
            subscription
        });

        return subscription;
    };

    private removeListeners = (type: string, callback: handler) => {
        if (!this.listeners[type]) {
            return;
        }
        const callbackIndex = this.listeners[type].findIndex(
            handler => handler.callback === callback
        );
        if (callbackIndex === -1) {
            return;
        }
        this.listeners[type] = [
            ...this.listeners[type].slice(0, callbackIndex),
            ...this.listeners[type].slice(
                callbackIndex + 1,
                this.listeners[type].length
            )
        ];
    };

    changeValue = (value: AppStateStatus) => {
        // Currently jest does not let us mock getters
        AppState.currentState = value;
        if (!this.listeners.change) {
            return;
        }
        this.listeners.change.forEach(handler => {
            try {
                handler.callback(value);
            } catch (e) {
                console.warn(
                    `Failure while executing callback for value ${value}`
                );
            }
        });
    };

    removeAllListeners = () => {
        this.listeners = {};
    };
}
