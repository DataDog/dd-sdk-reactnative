/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { LogEventMapper } from '../../types';

/**
 * Logs configuration options.
 */
export interface LogsConfigurationType {
    /**
     * Enables correlation between logs and RUM.
     */
    bundleLogsWithRum?: boolean;

    /**
     * Enables correlation between logs and traces.
     */
    bundleLogsWithTraces?: boolean;

    /**
     * Sets a target custom server for Logs.
     */
    customEndpoint?: string;

    /**
     * Custom mapper to transform log events.
     */
    logEventMapper?: LogEventMapper | null;
}

export type LogsConfigurationOptions = LogsConfigurationType;
