/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogBuffer } from './DatadogBuffer';

export class PassThroughBuffer extends DatadogBuffer {
    addCallback = (callback: () => any) => callback();
    addCallbackReturningId = (callback: () => any) => callback();
    addCallbackWithId = (callback: (id: string) => any, id: string) =>
        callback(id);

    drain = () => undefined;
}
