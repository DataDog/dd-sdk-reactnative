/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../../../../DdRum';
import type { RUMResource } from '../../interfaces/RumResource';

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
): Record<string, string | number> => {
    const attributes: Record<string, string | number> = {};
    if (tracingAttributes.samplingPriorityHeader !== '0') {
        attributes['_dd.span_id'] = tracingAttributes.spanId.toString(10);
        attributes['_dd.trace_id'] = tracingAttributes.traceId.toString(10);
        attributes['_dd.rule_psr'] = tracingAttributes.rulePsr;
    }

    return attributes;
};

const formatResourceStopContext = (
    timings: RUMResource['timings'],
    graphqlAttributes: RUMResource['graphqlAttributes']
): Record<string, unknown> => {
    const attributes: Record<string, unknown> = {};

    if (timings.responseStartTime !== undefined) {
        attributes['_dd.resource_timings'] = createTimings(
            timings.startTime,
            timings.responseStartTime,
            timings.stopTime
        );
    }

    if (graphqlAttributes?.operationType) {
        attributes['_dd.graphql.operation_type'] =
            graphqlAttributes.operationType;
        if (graphqlAttributes.operationName) {
            attributes['_dd.graphql.operation_name'] =
                graphqlAttributes.operationName;
        }
        if (graphqlAttributes.variables) {
            attributes['_dd.graphql.variables'] = graphqlAttributes.variables;
        }
    }

    return attributes;
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
        formatResourceStopContext(resource.timings, resource.graphqlAttributes),
        resource.timings.stopTime,
        resource.resourceContext
    );
};
