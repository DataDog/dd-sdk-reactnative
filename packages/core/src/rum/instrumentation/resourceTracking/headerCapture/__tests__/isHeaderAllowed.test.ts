/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { isHeaderAllowed } from '../isHeaderAllowed';

describe('isHeaderAllowed', () => {
    it('blocks sensitive headers', () => {
        expect(isHeaderAllowed('authorization')).toBe(false);
    });

    it('blocks tracing headers', () => {
        expect(isHeaderAllowed('x-datadog-trace-id')).toBe(false);
    });

    it('allows normal headers', () => {
        expect(isHeaderAllowed('content-type')).toBe(true);
    });

    describe('case-insensitive', () => {
        it('blocks Authorization (capitalized)', () => {
            expect(isHeaderAllowed('Authorization')).toBe(false);
        });

        it('blocks X-B3-TraceId (mixed case tracing header)', () => {
            expect(isHeaderAllowed('X-B3-TraceId')).toBe(false);
        });
    });

    it('allows headers that pass both checks', () => {
        expect(isHeaderAllowed('etag')).toBe(true);
    });
});
