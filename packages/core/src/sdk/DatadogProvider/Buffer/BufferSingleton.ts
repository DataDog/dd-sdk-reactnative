/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { BoundedBuffer } from './BoundedBuffer';
import type { DatadogBuffer } from './DatadogBuffer';
import { PassThroughBuffer } from './PassThroughBuffer';

export class BufferSingleton {
    private static bufferInstance: DatadogBuffer = new BoundedBuffer();

    static getInstance = (): DatadogBuffer => {
        return BufferSingleton.bufferInstance;
    };

    static onInitialization = () => {
        BufferSingleton.bufferInstance.drain();
        BufferSingleton.bufferInstance = new PassThroughBuffer();
    };

    static reset = () => {
        BufferSingleton.bufferInstance = new BoundedBuffer();
    };
}
