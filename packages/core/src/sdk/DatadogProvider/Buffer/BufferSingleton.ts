/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getGlobalInstance } from '../../../utils/singletonUtils';

import { BoundedBuffer } from './BoundedBuffer';
import type { DatadogBuffer } from './DatadogBuffer';
import { PassThroughBuffer } from './PassThroughBuffer';

const BUFFER_SINGLETON_MODULE = 'com.datadog.reactnative.buffer_singleton';

class _BufferSingleton {
    private bufferInstance: DatadogBuffer = new BoundedBuffer();

    getInstance = (): DatadogBuffer => {
        return BufferSingleton.bufferInstance;
    };

    onInitialization = () => {
        this.bufferInstance.drain();
        this.bufferInstance = new PassThroughBuffer();
    };

    reset = () => {
        BufferSingleton.bufferInstance = new BoundedBuffer();
    };
}

export const BufferSingleton = getGlobalInstance(
    BUFFER_SINGLETON_MODULE,
    () => new _BufferSingleton()
);
