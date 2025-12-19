/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { LogEventMapper } from '../../types';

import type {
    LogsConfigurationOptions,
    LogsConfigurationType
} from './LogsConfiguration.type';

const DEFAULTS = {
    bundleLogsWithRum: true,
    bundleLogsWithTraces: true,
    customEndpoint: undefined,
    logEventMapper: null
};

export class LogsConfiguration implements LogsConfigurationType {
    // Bundle Logs with RUM
    public bundleLogsWithRum: boolean = DEFAULTS.bundleLogsWithRum;

    // Bundle Logs with Traces
    public bundleLogsWithTraces: boolean = DEFAULTS.bundleLogsWithTraces;

    // Custom Endpoint URL
    public customEndpoint?: string = DEFAULTS.customEndpoint;

    // Custom Log Event Mapper
    public logEventMapper: LogEventMapper | null = DEFAULTS.logEventMapper;

    constructor(options: LogsConfigurationOptions = {}) {
        Object.assign(this, options);
    }
}

export { DEFAULTS as LOGS_DEFAULTS };
