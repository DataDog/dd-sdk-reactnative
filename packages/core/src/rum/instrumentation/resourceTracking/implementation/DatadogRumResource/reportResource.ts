import { DdRum } from '../../../../../foundation';
import type { RUMResource } from '../../domain/interfaces/RumResource';
import { createTimings } from '../resourceTiming';

const formatResourceStartContext = (
    tracingAttributes: RUMResource['tracingAttributes']
): Record<string, unknown> | undefined => {
    return tracingAttributes.tracingStrategy === 'DISCARD'
        ? undefined
        : {
              '_dd.span_id': tracingAttributes.spanId,
              '_dd.trace_id': tracingAttributes.traceId
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

export const reportResource = async (resource: RUMResource) => {
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
