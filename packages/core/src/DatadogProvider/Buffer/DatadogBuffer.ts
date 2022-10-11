/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export abstract class DatadogBuffer {
    /**
     * Add a callback that takes no input and yields no output to the buffer.
     */
    abstract addCallback: (callback: () => Promise<void>) => Promise<void>;

    /**
     * Add a callback that returns an id to the buffer.
     * This method also returns an id (possibly different), to be passed to addCallbackWithId.
     */
    abstract addCallbackReturningId: (
        callback: () => Promise<string>
    ) => Promise<string>;

    /**
     * Add a callback that takes an id as input to the buffer.
     * This id must be obtained by calling addCallbackReturningId.
     */
    abstract addCallbackWithId: (
        callback: (id: string) => Promise<void>,
        id: string
    ) => Promise<void>;

    /**
     * Execute all callbacks in the buffer.
     */
    abstract drain: () => void;
}
