/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Timer } from '../../../../../utils/Timer';
import {
    getCachedAccountId,
    getCachedSessionId,
    getCachedUserId
} from '../../../../helper';
import type { DdRumResourceTracingAttributes } from '../../distributedTracing/distributedTracingAttributes';
import { getTracingAttributes } from '../../distributedTracing/distributedTracing';
import { URLHostParser } from '../XHRProxy/URLHostParser';
import type { RequestProxyOptions } from '../interfaces/RequestProxy';
import type { DdRumResourceGraphqlAttributes } from '../interfaces/RumResource';

export interface RequestContext {
    graphql: DdRumResourceGraphqlAttributes & {
        trackErrors?: boolean;
    };
    method: string;
    url: string;
    timer: Timer;
    tracingAttributes: DdRumResourceTracingAttributes;
    baggageHeaderEntries: Set<string>;
}

export const createRequestContext = ({
    method,
    url,
    options
}: {
    method: string;
    url: string;
    options: RequestProxyOptions;
}): RequestContext => {
    return {
        method,
        url,
        timer: new Timer(),
        graphql: {},
        tracingAttributes: getTracingAttributes({
            hostname: URLHostParser(url),
            firstPartyHostsRegexMap: options.firstPartyHostsRegexMap,
            tracingSamplingRate: options.tracingSamplingRate,
            rumSessionId: getCachedSessionId(),
            userId: getCachedUserId(),
            accountId: getCachedAccountId()
        }),
        baggageHeaderEntries: new Set<string>()
    };
};
