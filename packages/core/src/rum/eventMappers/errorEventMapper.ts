/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { AdditionalEventDataForMapper } from '../../sdk/EventMappers/EventMapper';
import { EventMapper } from '../../sdk/EventMappers/EventMapper';
import type { ErrorSource } from '../types';

type RawError = {
    message: string;
    source: ErrorSource;
    stacktrace: string;
    context: object;
    timestampMs: number;
};

type ErrorEvent = RawError & AdditionalEventDataForMapper;

type NativeError = {
    message: string;
    source: ErrorSource;
    stacktrace: string;
    context: object;
    timestampMs: number;
};

export type ErrorEventMapper = (event: ErrorEvent) => ErrorEvent | null;

export const generateErrorEventMapper = (
    eventMapper: ErrorEventMapper | undefined
) =>
    new EventMapper(
        eventMapper,
        formatRawErrorToErrorEvent,
        formatErrorEventToNativeError,
        formatRawErrorToNativeError
    );

const formatRawErrorToErrorEvent = (
    error: RawError,
    additionalInformation: AdditionalEventDataForMapper
): ErrorEvent => {
    return {
        ...error,
        ...additionalInformation
    };
};

const formatRawErrorToNativeError = (error: RawError): NativeError => {
    return error;
};

const formatErrorEventToNativeError = (error: ErrorEvent): NativeError => {
    return error;
};
