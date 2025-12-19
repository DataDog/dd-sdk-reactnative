/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Enum specifying the Datadog SDK policy when batching data together before uploading it to Datadog servers.
 * Smaller batches mean smaller but more network requests, whereas larger batches mean fewer but larger network requests.
 */
export enum BatchSize {
    /**
     * Upload less frequent, larger batches of data
     */
    LARGE = 'LARGE',
    /**
     * Use default size for batches of data
     */
    MEDIUM = 'MEDIUM',
    /**
     * Upload more frequent, smaller batches of data
     */
    SMALL = 'SMALL'
}
