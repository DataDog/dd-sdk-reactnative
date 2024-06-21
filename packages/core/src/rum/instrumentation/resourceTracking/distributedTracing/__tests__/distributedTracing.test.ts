/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { TracingIdentifier, TracingIdFormat } from '../TracingIdentifier';

import TracingIdentifierUtils from './__utils__/tracingIdentifierUtils';

describe('TracingIdentifier', () => {
    it('M return an unique identifier W toString', async () => {
        // GIVEN
        const generatedIds = new Set<string>();
        const iterations = 100;
        let counter = iterations;

        // WHEN
        while (counter-- > 0) {
            generatedIds.add(
                TracingIdentifier.createTraceId().toString(
                    TracingIdFormat.decimal
                )
            );
            generatedIds.add(
                TracingIdentifier.createSpanId().toString(
                    TracingIdFormat.decimal
                )
            );
        }

        // THEN
        expect(generatedIds.size).toBe(iterations * 2);
    });

    describe('Trace IDs', () => {
        it('M return a valid 128 bits HEX string W toString(.hex)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createTraceId();
                const idStr128 = id.toString(TracingIdFormat.hex);

                // THEN
                expect(idStr128).toMatch(/^[0-9a-f]{8}[0]{8}[0-9a-f]{16}$/);
                expect(idStr128.length).toBeLessThanOrEqual(32);

                expect(
                    TracingIdentifierUtils.isWithin128Bits(idStr128, 16)
                ).toBe(true);
            }
        });

        it('M return a valid 64 bits HEX string W toString(.lowHex)', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createTraceId();
                const idHex = tracingId.toString(TracingIdFormat.lowHex);

                expect(idHex).toMatch(/^[0-9a-f]{1,}$/);
                expect(idHex.length).toBeLessThanOrEqual(16);

                expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 64 bits HEX string W toString(.highHex)', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createTraceId();
                const idHex = tracingId.toString(TracingIdFormat.highHex);

                expect(idHex).toMatch(/^[0-9a-f]{1,}$/);
                expect(idHex.length).toBeLessThanOrEqual(16);

                expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 128 bits HEX 32 string W toString(.paddedHex)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createTraceId();
                const idStr128 = id.toString(TracingIdFormat.paddedHex);

                // THEN
                expect(idStr128).toMatch(/^[0-9a-f]{8}[0]{8}[0-9a-f]{16}$/);
                expect(
                    TracingIdentifierUtils.isWithin128Bits(idStr128, 16)
                ).toBe(true);
            }
        });

        it('M return a valid 64 bits HEX 16 string W paddedLowHex', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createTraceId();
                const idHex = tracingId.toString(TracingIdFormat.paddedLowHex);

                expect(idHex).toMatch(/^[0-9a-f]{16}$/);
                expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 64 bits HEX 16 string W paddedHighHex', () => {
            const tracingId = TracingIdentifier.createTraceId();
            const idHex = tracingId.toString(TracingIdFormat.paddedHighHex);

            expect(idHex).toMatch(/^[0-9a-f]{8}[0]{8}$/);
            expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(true);
        });

        it('M return a valid 128 bits integer W toString(.decimal)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createTraceId();
                const idDecimal = id.toString(TracingIdFormat.decimal);

                // THEN
                expect(TracingIdentifierUtils.isWithin128Bits(idDecimal)).toBe(
                    true
                );
            }
        });

        it('M return a valid 64 bits low and high part integer W toString(.lowDecimal) & toString(.highDecimal)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createTraceId();
                const idStrLow64 = id.toString(TracingIdFormat.lowDecimal);
                const idStrHigh64 = id.toString(TracingIdFormat.highDecimal);

                // THEN
                expect(TracingIdentifierUtils.isWithin64Bits(idStrLow64)).toBe(
                    true
                );
                expect(TracingIdentifierUtils.isWithin64Bits(idStrHigh64)).toBe(
                    true
                );
            }
        });

        it('M return a valid timestamp in the high part of the 128 bits ID w toString(.paddedHex)', () => {
            const tracingId = TracingIdentifier.createTraceId();
            const idHex = tracingId.toString(TracingIdFormat.paddedHex);
            const timestamp = TracingIdentifierUtils.extractTimestamp(idHex);

            const currentUnixTime = Math.floor(Date.now() / 1000);
            const fiveMinutesInSeconds = 5 * 60;

            expect(timestamp).toBeGreaterThan(
                currentUnixTime - fiveMinutesInSeconds
            );
            expect(timestamp).toBeLessThan(
                currentUnixTime + fiveMinutesInSeconds
            );
        });

        it('M return valid string representations for zero ID w toString', () => {
            // GIVEN
            const tracingId = TracingIdentifier.createTraceId();
            (tracingId as any)['id'] = 0n;

            // THEN

            // Decimal
            expect(tracingId.toString(TracingIdFormat.decimal)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.lowDecimal)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.highDecimal)).toBe('0');

            // Hex
            expect(tracingId.toString(TracingIdFormat.hex)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.lowHex)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.highHex)).toBe('0');

            // Padded Hex
            expect(tracingId.toString(TracingIdFormat.paddedHex)).toBe(
                '00000000000000000000000000000000'
            );
            expect(tracingId.toString(TracingIdFormat.paddedLowHex)).toBe(
                '0000000000000000'
            );
            expect(tracingId.toString(TracingIdFormat.paddedHighHex)).toBe(
                '0000000000000000'
            );
        });
    });

    describe('Span IDs', () => {
        it('M return a valid 64 bits HEX string W toString(.hex)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createSpanId();
                const idStr64 = id.toString(TracingIdFormat.hex);

                // THEN
                expect(idStr64).toMatch(/^[0-9a-f]{1,}$/);
                expect(idStr64.length).toBeLessThanOrEqual(16);

                expect(TracingIdentifierUtils.isWithin64Bits(idStr64, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 32 bits HEX string W toString(.lowHex)', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createSpanId();
                const idHex = tracingId.toString(TracingIdFormat.lowHex);

                expect(idHex).toMatch(/^[0-9a-f]{1,}$/);
                expect(idHex.length).toBeLessThanOrEqual(8);

                expect(TracingIdentifierUtils.isWithin32Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 32 bits HEX string W toString(.highHex)', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createSpanId();
                const idHex = tracingId.toString(TracingIdFormat.highHex);

                expect(idHex).toMatch(/^[0-9a-f]{1,}$/);
                expect(idHex.length).toBeLessThanOrEqual(8);

                expect(TracingIdentifierUtils.isWithin32Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 64 bits HEX 16 string W toString(.paddedHex)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createSpanId();
                const idStr128 = id.toString(TracingIdFormat.paddedHex);

                // THEN
                expect(idStr128).toMatch(/^[0-9a-f]{16}$/);
                expect(
                    TracingIdentifierUtils.isWithin64Bits(idStr128, 16)
                ).toBe(true);
            }
        });

        it('M return a valid 64 bits HEX 8 string W paddedLowHex', () => {
            let iterations = 100;
            while (iterations-- > 0) {
                const tracingId = TracingIdentifier.createSpanId();
                const idHex = tracingId.toString(TracingIdFormat.paddedLowHex);

                expect(idHex).toMatch(/^[0-9a-f]{8}$/);
                expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(
                    true
                );
            }
        });

        it('M return a valid 64 bits HEX 8 string W paddedHighHex', () => {
            const tracingId = TracingIdentifier.createSpanId();
            const idHex = tracingId.toString(TracingIdFormat.paddedHighHex);

            expect(idHex).toMatch(/^[0-9a-f]{8}$/);
            expect(TracingIdentifierUtils.isWithin64Bits(idHex, 16)).toBe(true);
        });

        it('M return a valid 64 bits integer W toString(.decimal)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createSpanId();
                const idDecimal = id.toString(TracingIdFormat.decimal);

                // THEN
                expect(TracingIdentifierUtils.isWithin64Bits(idDecimal)).toBe(
                    true
                );
            }
        });

        it('M return a valid 32 bits low and high part integer W toString(.lowDecimal) & toString(.highDecimal)', async () => {
            let iterations = 100;
            while (iterations-- > 0) {
                // GIVEN
                const id = TracingIdentifier.createSpanId();
                const idStrLow32 = id.toString(TracingIdFormat.lowDecimal);
                const idStrHigh32 = id.toString(TracingIdFormat.highDecimal);

                // THEN
                expect(TracingIdentifierUtils.isWithin32Bits(idStrLow32)).toBe(
                    true
                );
                expect(TracingIdentifierUtils.isWithin32Bits(idStrHigh32)).toBe(
                    true
                );
            }
        });

        it('M return valid string representations for zero ID w toString', () => {
            // GIVEN
            const tracingId = TracingIdentifier.createSpanId();
            (tracingId as any)['id'] = 0n;

            // THEN

            // Decimal
            expect(tracingId.toString(TracingIdFormat.decimal)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.lowDecimal)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.highDecimal)).toBe('0');

            // Hex
            expect(tracingId.toString(TracingIdFormat.hex)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.lowHex)).toBe('0');
            expect(tracingId.toString(TracingIdFormat.highHex)).toBe('0');

            // Padded Hex
            expect(tracingId.toString(TracingIdFormat.paddedHex)).toBe(
                '0000000000000000'
            );
            expect(tracingId.toString(TracingIdFormat.paddedLowHex)).toBe(
                '00000000'
            );
            expect(tracingId.toString(TracingIdFormat.paddedHighHex)).toBe(
                '00000000'
            );
        });
    });
});
