/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { BufferSingleton } from './BufferSingleton';

export const bufferVoidNativeCall = (callback: () => Promise<void>) => {
    return BufferSingleton.getInstance().addCallback(callback);
};

export const bufferNativeCallReturningId = (
    callback: () => Promise<string>
) => {
    return BufferSingleton.getInstance().addCallbackReturningId(callback);
};

export const bufferNativeCallWithId = (
    callback: (id: string) => Promise<void>,
    id: string
) => {
    return BufferSingleton.getInstance().addCallbackWithId(callback, id);
};
