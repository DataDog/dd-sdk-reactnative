/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../../../DdRum';
import type { RUMResource } from '../../domain/interfaces/RumResource';

import { createTimings } from './resourceTiming';

type ResourceMapper = (resource: RUMResource) => RUMResource | null;

export class ResourceReporter {
    private mappers: ResourceMapper[];

    constructor(resourceMappers: ResourceMapper[]) {
        this.mappers = resourceMappers;
    }

    reportResource = (resource: RUMResource) => {
        let modifiedResource: RUMResource | null = resource;

        for (const mapper of this.mappers) {
            modifiedResource = mapper(resource);
            if (modifiedResource === null) {
                return;
            }
        }

        reportResource(modifiedResource);
    };
}

const formatResourceStartContext = (
    tracingAttributes: RUMResource['tracingAttributes']
): Record<string, unknown> | undefined => {
    return tracingAttributes.tracingStrategy === 'DISCARD'
        ? undefined
        : {
              '_dd.span_id': tracingAttributes.spanId,
              '_dd.trace_id': tracingAttributes.traceId,
              '_dd.rule_psr': tracingAttributes.rulePsr
          };
};

const formatResourceStopContext = (
    timings: RUMResource['timings']
): Record<string, unknown> => {
    return {
        '_dd.resource_timings':
            timings.responseStartTime !== undefined
                ? createTimings(
                      timings.startTime,
                      timings.responseStartTime,
                      timings.stopTime
                  )
                : null
    };
};

const reportResource = async (resource: RUMResource) => {
    await DdRum.startResource(
        resource.key,
        resource.request.method,
        resource.request.url,
        formatResourceStartContext(resource.tracingAttributes),
        resource.timings.startTime
    );

    DdRum.stopResource(
        resource.key,
        resource.response.statusCode,
        resource.request.kind,
        resource.response.size,
        formatResourceStopContext(resource.timings),
        resource.timings.stopTime
    );
};
