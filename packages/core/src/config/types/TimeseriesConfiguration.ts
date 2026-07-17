/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Experimental: configuration for memory and CPU timeseries collection.
 * Requires a native SDK build with timeseries support.
 */
export interface TimeseriesConfiguration {
    /**
     * Enables collection of memory and CPU timeseries events.
     */
    enabled: boolean;

    /**
     * The number of samples collected before a timeseries batch is flushed.
     * iOS and Android only.
     */
    bufferSize?: number;

    /**
     * The sampling interval in milliseconds.
     * Android only.
     */
    intervalMs?: number;
}
