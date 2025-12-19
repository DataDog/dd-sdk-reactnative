/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import BigInt from 'big-integer';

import { DdRumResourceTracking } from '../../DdRumResourceTracking';
import { XMLHttpRequestMock } from '../../__tests__/__utils__/XMLHttpRequestMock';
import type { TraceId } from '../TracingIdentifier';
import {
    TracingIdType,
    TracingIdentifier,
    TracingIdFormat
} from '../TracingIdentifier';
import { DistributedTracingSampling } from '../distributedTracingSampling';

import { TracingIdentifierUtils } from './__utils__/TracingIdentifierUtils';

// Create uuidv4-like session id
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function rand(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
};

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
            (tracingId as any)['id'] = BigInt(0);

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
            (tracingId as any)['id'] = BigInt(0);

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

describe('Sampling behavior', () => {
    describe('Sampling decisions are deterministic for traceId', () => {
        // [identifier (as BigInt), sampleRate, expected]
        const inputs: Array<[BigInt.BigInteger, number, boolean]> = [
            [BigInt('5577006791947779410'), 94.0509, true],
            [BigInt('15352856648520921629'), 43.7714, true],
            [BigInt('3916589616287113937'), 68.6823, true],
            [BigInt('894385949183117216'), 30.0912, true],
            [BigInt('12156940908066221323'), 46.889, true],
            [BigInt('9828766684487745566'), 15.6519, false],
            [BigInt('4751997750760398084'), 81.364, false],
            [BigInt('11199607447739267382'), 38.0657, false],
            [BigInt('6263450610539110790'), 21.8553, false],
            [BigInt('1874068156324778273'), 36.0871, false]
        ];

        beforeAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = XMLHttpRequestMock;
        });

        afterAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = undefined;
        });

        beforeEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        inputs.forEach(([identifier, sampleRate, expected]) => {
            it(`sampling decision is deterministic for traceId=${identifier.toString()} and sampleRate=${sampleRate}`, () => {
                DdRumResourceTracking.startTracking({
                    resourceTraceSampleRate: sampleRate,
                    firstPartyHosts: []
                });

                const tracingId: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const shouldSample = DistributedTracingSampling.shouldSampleTrace(
                    sampleRate,
                    null, // no sessionId -> fallback to traceId-based sampling
                    tracingId
                );

                expect(shouldSample).toBe(expected);
            });
        });
    });

    describe('Sampling decisions are deterministic by sessionId', () => {
        // [sessionId, identifier (as BigInt), sampleRate, expected]
        const inputs: Array<[string, BigInt.BigInteger, number, boolean]> = [
            [
                '11111111-2222-3333-4444-822107fcfd52',
                BigInt('5577006791947779410'),
                94.050909,
                true
            ],
            [
                '11111111-2222-3333-4444-4dc76695721d',
                BigInt('15352856648520921629'),
                43.771419,
                true
            ],
            [
                '11111111-2222-3333-4444-858149c6e2d1',
                BigInt('3916589616287113937'),
                68.682307,
                true
            ],
            [
                '11111111-2222-3333-4444-cb397916001e',
                BigInt('9828766684487745566'),
                15.651925,
                false
            ],
            [
                '11111111-2222-3333-4444-7f48392907a0',
                BigInt('894385949183117216'),
                30.091186,
                true
            ],
            [
                '11111111-2222-3333-4444-7cc6f3875d04',
                BigInt('4751997750760398084'),
                81.363996,
                true
            ],
            [
                '11111111-2222-3333-4444-ffa2ba517936',
                BigInt('11199607447739267382'),
                38.065719,
                true
            ],
            [
                '11111111-2222-3333-4444-21587cb3ad0b',
                BigInt('12156940908066221323'),
                46.888984,
                false
            ],
            [
                '11111111-2222-3333-4444-768b7c4e0b68',
                BigInt('11833901312327420776'),
                29.310186,
                false
            ],
            [
                '11111111-2222-3333-4444-3f2525632186',
                BigInt('6263450610539110790'),
                21.855305,
                false
            ]
        ];

        beforeAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = XMLHttpRequestMock;
        });

        afterAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = undefined;
        });

        beforeEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        inputs.forEach(([sessionId, identifier, sampleRate, expected]) => {
            it(`sampling decision is deterministic for ${sessionId} and sampleRate=${sampleRate}`, () => {
                // see note below
                DdRumResourceTracking.startTracking({
                    resourceTraceSampleRate: sampleRate,
                    firstPartyHosts: []
                });

                const tracingId: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const shouldSample = DistributedTracingSampling.shouldSampleTrace(
                    sampleRate,
                    sessionId,
                    tracingId
                );

                expect(shouldSample).toBe(expected);
            });
        });
    });

    describe('Sampling behavior for extreme and intermediate sampling rates', () => {
        const numSamples = 500;
        const maxTraceId = BigInt('18446744073709551615'); // 2^64 - 1

        beforeAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = XMLHttpRequestMock;
        });

        afterAll(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            global.XMLHttpRequest = undefined;
        });

        beforeEach(() => {
            DdRumResourceTracking.stopTracking();
        });

        test('Setting trace sample rate to 100 should always sample', () => {
            const sampleRate = 100;

            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: sampleRate,
                firstPartyHosts: []
            });

            for (let i = 0; i < 10; i++) {
                const identifier = BigInt.randBetween(BigInt.zero, maxTraceId);
                const trace: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const sessionId = uuidv4();
                const shouldSample = DistributedTracingSampling.shouldSampleTrace(
                    sampleRate,
                    sessionId,
                    trace
                );

                expect(shouldSample).toBe(true);
            }
        });

        test('Setting trace sample rate to 0 should never sample', () => {
            const sampleRate = 0;

            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: sampleRate,
                firstPartyHosts: []
            });

            for (let i = 0; i < 10; i++) {
                const identifier = BigInt.randBetween(BigInt.zero, maxTraceId);
                const trace: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const sessionId = uuidv4();
                const shouldSample = DistributedTracingSampling.shouldSampleTrace(
                    sampleRate,
                    sessionId,
                    trace
                );

                expect(shouldSample).toBe(false);
            }
        });

        test('Low sampling rate returns samples less often', () => {
            const sampleRate = 23;

            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: sampleRate,
                firstPartyHosts: []
            });

            let sampleCount = 0;
            let noSampleCount = 0;

            for (let i = 0; i < numSamples; i++) {
                const identifier = BigInt.randBetween(BigInt.zero, maxTraceId);
                const trace: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const sessionId = uuidv4();
                if (
                    DistributedTracingSampling.shouldSampleTrace(
                        sampleRate,
                        sessionId,
                        trace
                    )
                ) {
                    sampleCount++;
                } else {
                    noSampleCount++;
                }
            }

            expect(noSampleCount).toBeGreaterThanOrEqual(sampleCount);
            expect(sampleCount).toBeGreaterThanOrEqual(1);
        });

        test('High sampling rate returns samples more often', () => {
            const sampleRate = 85;

            DdRumResourceTracking.startTracking({
                resourceTraceSampleRate: sampleRate,
                firstPartyHosts: []
            });

            let sampleCount = 0;
            let noSampleCount = 0;

            for (let i = 0; i < numSamples; i++) {
                const identifier = BigInt.randBetween(BigInt.zero, maxTraceId);
                const trace: TraceId = TracingIdentifier.fromBigInt(
                    identifier,
                    TracingIdType.trace
                ) as TraceId;

                const sessionId = uuidv4();
                if (
                    DistributedTracingSampling.shouldSampleTrace(
                        sampleRate,
                        sessionId,
                        trace
                    )
                ) {
                    sampleCount++;
                } else {
                    noSampleCount++;
                }
            }

            expect(sampleCount).toBeGreaterThanOrEqual(noSampleCount);
            expect(noSampleCount).toBeGreaterThanOrEqual(1);
        });
    });
});
