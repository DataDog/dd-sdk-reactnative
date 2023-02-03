/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ResourceKind } from '../../../../types';
import type { DdRumResourceTracingAttributes } from '../distributedTracing';

export interface RUMResource {
    key: string;
    request: {
        method: string;
        url: string;
        kind: ResourceKind;
    };
    tracingAttributes: DdRumResourceTracingAttributes;
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
}
