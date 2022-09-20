/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export abstract class DatadogBuffer {
    abstract addCallback: (callback: () => Promise<void>) => Promise<void>;
    abstract addCallbackReturningId: (
        callback: () => Promise<string>
    ) => Promise<string>;
    abstract addCallbackWithId: (
        callback: (id: string) => Promise<void>,
        id: string
    ) => Promise<void>;
    abstract drain: () => void;
}
