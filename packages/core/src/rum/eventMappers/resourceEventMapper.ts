/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AdditionalEventDataForMapper } from '../../sdk/EventMappers/EventMapper';
import { EventMapper } from '../../sdk/EventMappers/EventMapper';
import type { ResourceKind } from '../types';

type RawResource = {
    readonly key: string;
    readonly statusCode: number;
    readonly kind: ResourceKind;
    readonly size: number;
    context: object;
    readonly timestampMs: number;
    resourceContext: XMLHttpRequest | undefined;
};

type ResourceEvent = RawResource & AdditionalEventDataForMapper;

type NativeResource = {
    key: string;
    statusCode: number;
    kind: ResourceKind;
    size: number;
    context: object;
    timestampMs: number;
};

export type ResourceEventMapper = (
    event: ResourceEvent
) => ResourceEvent | null;

export const generateResourceEventMapper = (
    eventMapper: ResourceEventMapper | undefined
) =>
    new EventMapper(
        eventMapper,
        formatRawResourceToResourceEvent,
        formatResourceEventToNativeResource,
        formatRawResourceToNativeResource
    );

const formatRawResourceToResourceEvent = (
    error: RawResource,
    additionalInformation: AdditionalEventDataForMapper
): ResourceEvent => {
    return {
        ...error,
        ...additionalInformation
    };
};

const formatRawResourceToNativeResource = (
    error: RawResource
): NativeResource => {
    return error;
};

const formatResourceEventToNativeResource = (
    error: ResourceEvent,
    originalEvent: ResourceEvent
): NativeResource => {
    return {
        ...error,
        key: originalEvent.key,
        statusCode: originalEvent.statusCode,
        kind: originalEvent.kind,
        size: originalEvent.size,
        timestampMs: originalEvent.timestampMs
    };
};
