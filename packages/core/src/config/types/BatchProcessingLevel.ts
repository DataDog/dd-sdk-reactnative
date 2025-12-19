/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Enum specifying the preferred level for processing batches of data.
 */
export enum BatchProcessingLevel {
    /**
     * Only 1 batch will be sent in a single upload cycle.
     */
    LOW = 'LOW',
    /**
     * 10 batches will be sent in a single upload cycle
     */
    MEDIUM = 'MEDIUM',
    /**
     * 100 batches will be sent in a single upload cycle.
     */
    HIGH = 'HIGH'
}
