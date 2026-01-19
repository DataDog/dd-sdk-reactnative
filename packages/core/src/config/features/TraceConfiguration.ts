/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type {
    TraceConfigurationOptions,
    TraceConfigurationType
} from './TraceConfiguration.type';

const DEFAULTS = {
    customEndpoint: undefined
};

export class TraceConfiguration implements TraceConfigurationType {
    // Custom Endpoint URL
    public customEndpoint?: string = DEFAULTS.customEndpoint;

    constructor(options: TraceConfigurationOptions = {}) {
        Object.assign(this, options);
    }
}

export { DEFAULTS as TRACE_DEFAULTS };
