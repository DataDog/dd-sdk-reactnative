/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Enum specifying preferred frequency for uploading batches of data.
 */
export enum UploadFrequency {
    /**
     * Upload data every 1000ms.
     */
    FREQUENT = 'FREQUENT',
    /**
     * Upload data every 5000ms.
     */
    AVERAGE = 'AVERAGE',
    /**
     * Upload data every 10000ms.
     */
    RARE = 'RARE'
}
