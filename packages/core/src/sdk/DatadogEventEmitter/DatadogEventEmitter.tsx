/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
export type DatadogEventEmitterCallback = (data: any) => void;

export interface DatadogEventEmitter {
    initialize(): boolean;
    addListener(eventName: string, callback: DatadogEventEmitterCallback): void;
    removeAllListeners(eventName: string): void;
}
