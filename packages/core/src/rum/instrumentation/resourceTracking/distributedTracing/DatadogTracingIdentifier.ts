/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { BigInteger } from 'big-integer';

import type {
    TraceId,
    SpanId,
    TracingIdentifier,
    TracingIdType,
    TracingIdFormat
} from './TracingIdentifier';

/**
 * A read-only wrapper of {@link TracingIdentifier} for public API usage.
 */
export class DatadogTracingIdentifier {
    /**
     * Read-only generated ID as a {@link BigInteger}.
     */
    get id(): BigInteger {
        return this.uuid.id;
    }

    /**
     * Read-only type to determine whether the identifier is a {@link TraceId} or a {@link SpanId}.
     */
    get type(): TracingIdType {
        return this.uuid.type;
    }

    private uuid: TracingIdentifier;

    public constructor(uuid: TraceId | SpanId) {
        this.uuid = uuid;
    }

    /**
     * Returns a string representation of the Tracing ID.
     * @param format - The type of representation to use.
     * @returns The ID as a string in the specified representation type.
     */
    toString(format: TracingIdFormat): string {
        return this.uuid.toString(format);
    }
}
