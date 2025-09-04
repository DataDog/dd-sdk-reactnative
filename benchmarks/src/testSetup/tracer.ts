/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DefaultTimeProvider } from "@datadog/mobile-react-native";

const timeProvider = new DefaultTimeProvider();

export const Tracer = {
    startSpan: (operation: string, context?: object, timestampMs: number = timeProvider.now()): Promise<string> => {
        console.info("Tracer - startSpan", operation, context, timestampMs);
        return Promise.resolve(`spanId_${operation}_${timestampMs}`);
    },
    finishSpan: (spanId: string, context?: object, timestampMs: number = timeProvider.now()): Promise<void> => {
        console.info("Tracer - finishSpan", spanId, context, timestampMs);
        return Promise.resolve();
    }
}