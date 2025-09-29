/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DefaultTimeProvider, ErrorSource, RumActionType } from "@datadog/mobile-react-native";
import type { DdRumType, ResourceKind } from "@datadog/mobile-react-native/lib/typescript/rum/types";
import type { GestureResponderEvent } from "react-native/types";

const timeProvider = new DefaultTimeProvider();

export const Monitor: Pick<DdRumType, 'startView' | 'stopView' | 'addAction' | 'startResource' | 'stopResource' | 'addError'> = {
    startView: (
        key: string,
        name: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> => {
        console.info("Monitor - startView", key, name, context, timestampMs);
        return Promise.resolve();
    },
    stopView: (
        key: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> => {
        console.info("Monitor - stopView", key, context, timestampMs);
        return Promise.resolve();
    },
    addAction: (
        type: RumActionType,
        name: string,
        context: object = {},
        timestampMs: number = timeProvider.now(),
        actionContext?: GestureResponderEvent
    ): Promise<void> => {
        console.info("Monitor - addAction", type, name, context, timestampMs, actionContext);
        return Promise.resolve();
    },
    startResource: (
        key: string,
        method: string,
        url: string,
        context: object = {},
        timestampMs: number = timeProvider.now()
    ): Promise<void> => {
        console.info("Monitor - startResource", key, method, url, context, timestampMs);
        return Promise.resolve();
    },
    stopResource: (
        key: string,
        statusCode: number,
        kind: ResourceKind,
        size: number = -1,
        context: object = {},
        timestampMs: number = timeProvider.now(),
        resourceContext?: XMLHttpRequest
    ): Promise<void> => {
        console.info("Monitor - stopResource", key, statusCode, kind, size, context, timestampMs, resourceContext);
        return Promise.resolve();
    },
    addError: (
        message: string,
        source: ErrorSource,
        stacktrace: string,
        context: object = {},
        timestampMs: number = timeProvider.now(),
        fingerprint?: string
    ): Promise<void> => {
        console.info("Monitor - addError", message, source, stacktrace, context, timestampMs, fingerprint);
        return Promise.resolve();
    },
};
