/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ResourceKind } from '../../../../types';
import type { DdRumResourceTracingAttributes } from '../../distributedTracing/distributedTracingAttributes';

export interface RUMResource {
    key: string;
    request: {
        method: string;
        url: string;
        kind: ResourceKind;
    };
    tracingAttributes: DdRumResourceTracingAttributes;
    graphqlAttributes?: DdRumResourceGraphqlAttributes;
    response: {
        statusCode: number;
        size: number;
    };
    timings: {
        startTime: number;
        stopTime: number;
        responseStartTime?: number;
    };
    resourceContext?: XMLHttpRequest;
    capturedRequestHeaders?: Record<string, string>;
    capturedResponseHeaders?: Record<string, string>;
}

export type DdRumResourceGraphqlError = {
    message: string;
    code?: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
};

export type DdRumResourceGraphqlAttributes = {
    operationType?: string;
    operationName?: string;
    variables?: string;
    payload?: string;
    errors?: DdRumResourceGraphqlError[];
};
