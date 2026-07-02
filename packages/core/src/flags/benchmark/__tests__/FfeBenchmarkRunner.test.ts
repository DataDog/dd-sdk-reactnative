/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { runJsBenchmark } from '../FfeBenchmarkRunner';

describe('FFE benchmark runner', () => {
    it('evaluates the full maxcomplex workload in JavaScript', () => {
        const result = runJsBenchmark();

        expect(result.measurement).toBe('js-in-process');
        expect(result.checksum).toBe('114e3e58');
        expect(result.evalTotalMs).toBeGreaterThan(0);
        expect(result.perEvalUs).toBeGreaterThan(0);
    });
});
