/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export default class TracingIdentifierUtils {
    /**
     * Extracts the Unix timestamp from the 128-bit hex string representation.
     * @param idHex - The 128-bit ID as a hexadecimal string.
     * @returns The Unix timestamp as a number.
     */
    public static extractTimestamp(idHex: string): number {
        // Extract the first 8 characters which represent the 32-bit Unix timestamp
        const timestampHex = idHex.substring(0, 8);

        // Convert the hexadecimal string to a number
        const timestamp = parseInt(timestampHex, 16);

        return timestamp;
    }

    /**
     * Checks if a string representation of an ID in a given radix is within 32 bits.
     * @param idString - The string representation of the ID.
     * @param radix - Optional base to use for the conversion (default is 10).
     * @returns True if the ID is within 32 bits, otherwise false.
     */
    public static isWithin32Bits(
        idString: string,
        radix: number = 10
    ): boolean {
        const bigIntValue = BigInt(parseInt(idString, radix));
        return bigIntValue < BigInt(1) << BigInt(32);
    }

    /**
     * Checks if a string representation of an ID in a given radix is within 64 bits.
     * @param idString - The string representation of the ID.
     * @param radix - Optional base to use for the conversion (default is 10).
     * @returns True if the ID is within 64 bits, otherwise false.
     */
    public static isWithin64Bits(
        idString: string,
        radix: number = 10
    ): boolean {
        const bigIntValue = BigInt(parseInt(idString, radix));
        return bigIntValue < BigInt(1) << BigInt(64);
    }

    /**
     * Checks if a string representation of an ID in a given radix is within 128 bits.
     * @param idString - The string representation of the ID.
     * @param radix - Optional base to use for the conversion (default is 10).
     * @returns True if the ID is within 128 bits, otherwise false.
     */
    public static isWithin128Bits(
        idString: string,
        radix: number = 10
    ): boolean {
        const bigIntValue = BigInt(parseInt(idString, radix));
        return bigIntValue < BigInt(1) << BigInt(128);
    }
}
