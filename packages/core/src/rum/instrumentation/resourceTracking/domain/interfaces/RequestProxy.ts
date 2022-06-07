/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export interface RequestProxyOptions {
    tracingSamplingRate: number;
    firstPartyHostsRegex: RegExp;
}

export abstract class RequestProxy {
    abstract onTrackingStart: (context: RequestProxyOptions) => void;
    abstract onTrackingStop: () => void;
}
