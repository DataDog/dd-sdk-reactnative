/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../../../../DdRum';
import type {
    ResourceEvent,
    ResourceEventMapper
} from '../../../../../eventMappers/resourceEventMapper';
import { TracingIdFormat } from '../../../distributedTracing/TracingIdentifier';
import type { RUMResource } from '../../interfaces/RumResource';

import { createTimings } from './resourceTiming';

export type ReportedResourceEvent = RUMResource & ResourceEvent;
type ResourceEventMapperAdapter = (
    resource: ReportedResourceEvent
) => Partial<ReportedResourceEvent> | null;
type RumResourceMapper = (resource: RUMResource) => RUMResource | null;
export type ResourceMapper = ResourceEventMapperAdapter | RumResourceMapper;

export class ResourceReporter {
    private resourceMappers: ResourceMapper[];
    private resourceEventMapper?: ResourceEventMapper | null;

    constructor(
        resourceMappers: ResourceMapper[],
        resourceEventMapper?: ResourceEventMapper | null
    ) {
        this.resourceMappers = resourceMappers;
        this.resourceEventMapper = resourceEventMapper;
    }

    reportResource = (resource: RUMResource) => {
        let modifiedResource = toReportedResourceEvent(resource);

        for (const mapper of this.getMappers()) {
            const mappedResource = mapper(modifiedResource);
            if (mappedResource === null) {
                return;
            }
            modifiedResource = {
                ...modifiedResource,
                ...mappedResource
            };
        }

        reportResource({
            ...modifiedResource,
            request: {
                ...modifiedResource.request,
                url:
                    modifiedResource.resourceContext?.responseURL ??
                    modifiedResource.request.url
            }
        });
    };

    setResourceEventMapper = (
        resourceEventMapper?: ResourceEventMapper | null
    ): void => {
        this.resourceEventMapper = resourceEventMapper;
    };

    private getMappers = (): ResourceMapper[] => [
        ...this.resourceMappers,
        ...(this.resourceEventMapper ? [this.resourceEventMapper] : [])
    ];
}

const formatResourceStartContext = (
    tracingAttributes: RUMResource['tracingAttributes']
): Record<string, string | number> => {
    const attributes: Record<string, string | number> = {};
    if (tracingAttributes.samplingPriorityHeader !== '0') {
        attributes['_dd.span_id'] = tracingAttributes.spanId.toString(
            TracingIdFormat.decimal
        );
        attributes['_dd.trace_id'] = tracingAttributes.traceId.toString(
            TracingIdFormat.paddedHex
        );
        attributes['_dd.rule_psr'] = tracingAttributes.rulePsr;
    }

    return attributes;
};

const toReportedResourceEvent = (resource: RUMResource): ReportedResourceEvent => ({
    ...resource,
    statusCode: resource.response.statusCode,
    kind: resource.request.kind,
    size: resource.response.size,
    context: {},
    timestampMs: resource.timings.stopTime,
    resourceContext: resource.resourceContext,
    attributes: {}
});

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

        if (graphqlAttributes.payload) {
            attributes['_dd.graphql.payload'] = graphqlAttributes.payload;
        }

        if (graphqlAttributes.errors) {
            attributes['_dd.graphql.errors'] = JSON.stringify(
                graphqlAttributes.errors
            );
        }
    }

    return attributes;
};

const reportResource = async (resource: ReportedResourceEvent) => {
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
