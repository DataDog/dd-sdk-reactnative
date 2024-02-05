/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { buildRumViewAssertions } from '../view';

import { mockRumView } from './__utils__/views.mock';

describe('views assertions', () => {
    describe('toHaveViewWith', () => {
        it('does not throw if it contains an view with correct name', () => {
            const views = [
                mockRumView({
                    name: 'Application Started'
                }),
                mockRumView({
                    name: 'Main'
                })
            ];
            const viewAssertions = buildRumViewAssertions(views);
            expect(() =>
                viewAssertions.toHaveViewWith({
                    name: 'Main'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain an view with correct name', () => {
            const views = [
                mockRumView({
                    name: 'Main'
                })
            ];
            const viewAssertions = buildRumViewAssertions(views);
            expect(() =>
                viewAssertions.toHaveViewWith({
                    name: 'Application Started'
                })
            ).toThrow();
        });

        it('throws if no name were provided ', () => {
            const views = [
                mockRumView({
                    name: 'Main'
                })
            ];
            const viewAssertions = buildRumViewAssertions(views);
            expect(() => viewAssertions.toHaveViewWith({})).toThrow();
        });
    });
});
