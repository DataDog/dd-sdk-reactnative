/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getGlobalInstance } from '../../../utils/singletonUtils';

import { BoundedBuffer } from './BoundedBuffer';
import type { DatadogBuffer } from './DatadogBuffer';
import { NavigationBuffer } from './NavigationBuffer';
import { PassThroughBuffer } from './PassThroughBuffer';

// IMPORTANT: Keep this key aligned with the react-navigation package
const BUFFER_SINGLETON_MODULE = 'com.datadog.reactnative.buffer_singleton';

class _BufferSingleton {
    private bufferInstance: DatadogBuffer = new BoundedBuffer();
    private navigationBuffer: NavigationBuffer | null = null;

    getInstance = (): DatadogBuffer => {
        return BufferSingleton.bufferInstance;
    };

    getNavigationBuffer = (): NavigationBuffer | null => {
        return this.navigationBuffer;
    };

    onInitialization = () => {
        this.bufferInstance.drain();
        // Guard: do not recreate the navigation buffer if already initialized.
        // This can happen if onInitialization is called multiple times (e.g. hot reload).
        // Note: the NavigationBuffer wraps all SDK calls (not just RUM) by design --
        // this is intentional per the RFC so that every native bridge call is buffered
        // during navigation transitions.
        if (!this.navigationBuffer) {
            this.navigationBuffer = new NavigationBuffer(
                new PassThroughBuffer()
            );
        }
        this.bufferInstance = this.navigationBuffer;
    };

    reset = () => {
        this.navigationBuffer?.endNavigation();
        this.navigationBuffer = null;
        BufferSingleton.bufferInstance = new BoundedBuffer();
    };
}

export const BufferSingleton = getGlobalInstance(
    BUFFER_SINGLETON_MODULE,
    () => new _BufferSingleton()
);
