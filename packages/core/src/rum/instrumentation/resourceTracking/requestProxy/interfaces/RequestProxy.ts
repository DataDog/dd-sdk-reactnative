/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PropagatorType } from '../../../../types';

export interface RequestProxyOptions {
    tracingSamplingRate: number;
    firstPartyHostsRegexMap: RegexMap;
}

export type RegexMap = {
    regex: RegExp;
    propagatorType: PropagatorType;
}[];

export abstract class RequestProxy {
    abstract onTrackingStart: (context: RequestProxyOptions) => void;
    abstract onTrackingStop: () => void;
}
