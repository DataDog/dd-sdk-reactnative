/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AppStateEvent, AppStateStatus } from 'react-native';
import { AppState } from 'react-native';

type handler = (type: AppStateStatus) => void;

/**
 * This is a mock of legacy implementation of AppState (up until RN 0.65).
 * In the new version, removeEventListener has been deprecated and addEventListener
 * now returns a subscription.
 */
export class AppStateMockLegacy {
    private listeners: { [eventType: string]: handler[] } = {};

    addEventListener = (type: AppStateEvent, callback: handler) => {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    };

    removeEventListener = (type: string, callback: handler) => {
        if (!this.listeners[type]) {
            return;
        }
        const callbackIndex = this.listeners[type].indexOf(callback);
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
        this.listeners.change.forEach(callback => {
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
        this.listeners = {};
    };
}
