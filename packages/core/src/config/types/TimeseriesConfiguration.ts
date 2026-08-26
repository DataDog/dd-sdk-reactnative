/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Experimental: the type of timeseries data to collect.
 */
export type TimeseriesType = 'cpu' | 'memory';

/**
 * Experimental: configuration for memory and CPU timeseries collection.
 * Requires a native SDK build with timeseries support.
 */
export interface TimeseriesConfiguration {
    /**
     * The types of timeseries data to collect.
     * Defaults to collecting all supported types when omitted.
     */
    collectTypes?: TimeseriesType[];
}
