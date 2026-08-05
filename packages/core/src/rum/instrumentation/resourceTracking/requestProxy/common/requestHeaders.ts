/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getTracingHeadersFromAttributes } from '../../distributedTracing/distributedTracingHeaders';
import {
    BAGGAGE_HEADER_KEY,
    TRACKED_BY_HEADER_KEY,
    TRACKED_BY_HEADER_VALUE
} from '../../distributedTracing/headers';
import {
    DATADOG_GRAPH_QL_ERROR_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_PAYLOAD_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from '../../graphql/graphqlHeaders';
import { DATADOG_BAGGAGE_HEADER, isDatadogCustomHeader } from '../../headers';
import { formatBaggageHeader } from '../XHRProxy/baggageHeaderUtils';

import type { RequestContext } from './RequestContext';

export type ProcessedRequestHeader =
    | { type: 'drop' }
    | { type: 'send'; header: string; value: string };

export const processRequestHeader = ({
    context,
    header,
    value
}: {
    context: RequestContext;
    header: string;
    value: string;
}): ProcessedRequestHeader => {
    const key = header.toLowerCase();

    if (isDatadogCustomHeader(key)) {
        switch (key) {
            case DATADOG_GRAPH_QL_OPERATION_NAME_HEADER:
                context.graphql.operationName = value;
                return { type: 'drop' };
            case DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER:
                context.graphql.operationType = value;
                return { type: 'drop' };
            case DATADOG_GRAPH_QL_VARIABLES_HEADER:
                context.graphql.variables = value;
                return { type: 'drop' };
            case DATADOG_GRAPH_QL_PAYLOAD_HEADER:
                context.graphql.payload = value;
                return { type: 'drop' };
            case DATADOG_GRAPH_QL_ERROR_HEADER:
                context.graphql.trackErrors = value === 'true' || value === '1';
                return { type: 'drop' };
            case DATADOG_BAGGAGE_HEADER:
                return {
                    type: 'send',
                    header: BAGGAGE_HEADER_KEY,
                    value
                };
            default:
                return { type: 'send', header, value };
        }
    }

    if (key === BAGGAGE_HEADER_KEY) {
        context.baggageHeaderEntries.add(value);
        return { type: 'drop' };
    }

    return { type: 'send', header, value };
};

export const getInstrumentationHeaders = (
    context: RequestContext
): { header: string; value: string }[] => {
    const headers: { header: string; value: string }[] = [];
    getTracingHeadersFromAttributes(context.tracingAttributes).forEach(
        ({ header, value }) => {
            if (header.toLowerCase() === BAGGAGE_HEADER_KEY) {
                context.baggageHeaderEntries.add(value);
            } else {
                headers.push({ header, value });
            }
        }
    );
    const baggageHeader = formatBaggageHeader(context.baggageHeaderEntries);

    if (baggageHeader) {
        headers.push({
            // Use the internal header so XHR can distinguish SDK-generated
            // baggage from user-provided baggage during interception.
            header: DATADOG_BAGGAGE_HEADER,
            value: baggageHeader
        });
    }

    headers.push({
        header: TRACKED_BY_HEADER_KEY,
        value: TRACKED_BY_HEADER_VALUE
    });

    return headers;
};
