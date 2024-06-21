/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Available formats for representing the {@link TracingIdentifier} as a string.
 */
export enum TracingIdFormat {
    /**
     * Decimal string representation of the full tracing id.
     */
    decimal,

    /**
     * The low bits of the tracing id as a decimal.
     */
    lowDecimal,

    /**
     * The high bits of the tracing id as a decimal.
     */
    highDecimal,

    /**
     * Hexadecimal string representation of the full tracing id.
     */
    hex,

    /**
     * Hexadecimal string representation of the low bits of the tracing id.
     */
    lowHex,

    /**
     * Hexadecimal string representation of the high bits of the tracing id.
     */
    highHex,

    /**
     * Padded hexadecimal string representation of the full tracing id.
     */
    paddedHex,

    /**
     * Padded hexadecimal string representation of the low bits of the tracing id.
     */
    paddedLowHex,

    /**
     * Padded hexadecimal string representation of the high bits of the tracing id.
     */
    paddedHighHex
}

/**
 * A {@link TracingIdentifier} used for Traces (128 bit).
 */
export type TraceId = TracingIdentifier & {
    _brand: 'traceId';
};

/**
 * A {@link TracingIdentifier} used for Spans (64 bit).
 */
export type SpanId = TracingIdentifier & {
    _brand: 'spanId';
};

/**
 * The tracing identifier type.
 */
export enum TracingIdType {
    /**
     * 128-bit UUID.
     */
    trace,
    /**
     * 64-bit UUID.
     */
    span
}

/**
 * Value used to mask the low 64 bits of the trace identifier.
 */
const LOW_64BIT_MASK = (BigInt('0xffffffff') << 32n) + BigInt('0xffffffff');

/**
 * Value used to mask the low 32 bits of the trace identifier.
 */
const LOW_32BIT_MASK = (BigInt('0xffff') << 16n) + BigInt('0xffff');

/**
 * A {@link TracingIdentifier} is a unique UUID that can be 64bit or 128bit, and provides
 * convenient methods to represent it as a HEX or DECIMAL string, and it allows the masking
 * of its low or high bits.
 *
 * Create a new identifier by calling {@link TracingIdentifier.createTraceId()} or
 * {@link TracingIdentifier.createSpanId()}.
 */
export class TracingIdentifier {
    /**
     * Read-only generated ID as a {@link bigint}.
     */
    readonly id: bigint;

    /**
     * Read-only type to determine whether the identifier is a {@link TraceId} or a {@link SpanId}.
     */
    readonly type: TracingIdType;

    /**
     * Creates a new unique Trace ID.
     * @returns the generated {@link TraceId}.
     */
    public static createTraceId(): TraceId {
        return new TracingIdentifier(TracingIdType.trace) as TraceId;
    }

    /**
     * Creates a new unique Span ID.
     * @returns the generated {@link SpanId}.
     */
    public static createSpanId(): SpanId {
        return new TracingIdentifier(TracingIdType.span) as SpanId;
    }

    /**
     * Private constructor to initialize the {@link TracingIdentifier} based on the given
     * {@link TracingIdType}.
     */
    private constructor(type: TracingIdType) {
        this.id = this.generateUUID(type);
        this.type = type;
    }

    /**
     * Generates a unique ID with the given format.
     * @param format - the desired format (64bit or 128bit).
     * @returns the generated UUID as a {@link bigint}.
     */
    private generateUUID(type: TracingIdType): bigint {
        // Get the current Unix timestamp in seconds
        const unixSeconds = Math.floor(Date.now() / 1000);

        // Ensure the Unix timestamp is 32 bits
        const unixSeconds32 = unixSeconds & 0xffffffff;

        // 32 bits of zero
        const zeros32 = 0;

        // Generate 64 random bits using Math.random()
        const random32Bit1 = Math.floor(Math.random() * 0xffffffff);
        const random32Bit2 = Math.floor(Math.random() * 0xffffffff);
        const random64Hex =
            random32Bit1.toString(16).padStart(8, '0') +
            random32Bit2.toString(16).padStart(8, '0');

        // If type is 'span' we return the generated 64 bit ID
        if (type === TracingIdType.span) {
            return BigInt(`0x${random64Hex}`);
        }

        // Convert parts to hexadecimal strings
        const unixSecondsHex = unixSeconds32.toString(16).padStart(8, '0');
        const zerosHex = zeros32.toString(16).padStart(8, '0');

        // Combine parts to form the 128-bit ID
        const hex128BitID = unixSecondsHex + zerosHex + random64Hex;

        return BigInt(`0x${hex128BitID}`);
    }

    /**
     * Returns a string representation of the Tracing ID.
     * @param format - The type of representation to use.
     * @returns The ID as a string in the specified representation type.
     */
    public toString(format: TracingIdFormat): string {
        const lowTraceMask =
            this.type === TracingIdType.trace ? LOW_64BIT_MASK : LOW_32BIT_MASK;
        const highTraceMask = this.type === TracingIdType.trace ? 64n : 32n;
        const padding = this.type === TracingIdType.trace ? 32 : 16;

        switch (format) {
            case TracingIdFormat.decimal:
                return this.id.toString(10);

            case TracingIdFormat.lowDecimal:
                return (this.id & lowTraceMask).toString(10);

            case TracingIdFormat.highDecimal:
                return (this.id >> highTraceMask).toString(10);

            case TracingIdFormat.hex:
                return this.id.toString(16);

            case TracingIdFormat.lowHex:
                return (this.id & lowTraceMask).toString(16);

            case TracingIdFormat.highHex:
                return (this.id >> highTraceMask).toString(16);

            case TracingIdFormat.paddedHex:
                return this.toString(TracingIdFormat.hex).padStart(
                    padding,
                    '0'
                );

            case TracingIdFormat.paddedLowHex:
                return this.toString(TracingIdFormat.lowHex).padStart(
                    padding / 2,
                    '0'
                );

            case TracingIdFormat.paddedHighHex:
                return this.toString(TracingIdFormat.highHex).padStart(
                    padding / 2,
                    '0'
                );
        }
    }
}
