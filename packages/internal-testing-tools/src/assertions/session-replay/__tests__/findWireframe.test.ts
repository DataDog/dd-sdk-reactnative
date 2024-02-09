/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { findViewWireframes, findViewTextWireframe } from '../findWireframe';

import { mockSessionReplayFullSnapshotSegment } from './__utils__/segments.mock';
import { mockRumViewForSessionReplay } from './__utils__/views.mock';
import { mockSessionReplayWireframe } from './__utils__/wireframes.mock';

describe('findWireframe', () => {
    describe('findViewWireframes', () => {
        it('does not throw when wireframes matching type for given view are found', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'shape' }),
                    mockSessionReplayWireframe({ type: 'text', text: 'mock' })
                ]
            });

            expect(() =>
                findViewWireframes('shape', [segmentMock], [viewMock], {
                    viewName: 'Main'
                })
            ).not.toThrow();
            expect(() =>
                findViewWireframes('text', [segmentMock], [viewMock], {
                    viewName: 'Main'
                })
            ).not.toThrow();
        });

        it('throws if no wireframe matches criteria', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [mockSessionReplayWireframe({ type: 'shape' })]
            });

            expect(() =>
                findViewWireframes('text', [segmentMock], [viewMock], {
                    viewName: 'Main'
                })
            ).toThrow();
        });

        it('throws if no view matches view name', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [mockSessionReplayWireframe({ type: 'shape' })]
            });

            expect(() =>
                findViewWireframes('shape', [segmentMock], [viewMock], {
                    viewName: 'About'
                })
            ).toThrow();
        });
    });
    describe('findViewTextWireframe', () => {
        it('does not throw when a wireframe matching text for a given view is found', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'text', text: 'mock' }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'something else'
                    })
                ]
            });

            expect(() =>
                findViewTextWireframe([segmentMock], [viewMock], {
                    viewName: 'Main',
                    text: 'mock'
                })
            ).not.toThrow();
            expect(() =>
                findViewTextWireframe([segmentMock], [viewMock], {
                    viewName: 'Main',
                    text: 'something'
                })
            ).not.toThrow();
        });

        it('throws if no wireframe matching text is found', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'text', text: 'mock' })
                ]
            });

            expect(() =>
                findViewTextWireframe([segmentMock], [viewMock], {
                    viewName: 'Main',
                    text: 'something'
                })
            ).toThrow();
        });

        it('throws if multiple wireframes matching text are found', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'text', text: 'mock' }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock too'
                    })
                ]
            });

            expect(() =>
                findViewTextWireframe([segmentMock], [viewMock], {
                    viewName: 'Main',
                    text: 'mock'
                })
            ).toThrow();
        });

        it('throws if no view matches view name', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'text', text: 'mock' })
                ]
            });

            expect(() =>
                findViewTextWireframe([segmentMock], [viewMock], {
                    viewName: 'About',
                    text: 'mock'
                })
            ).toThrow();
        });
    });
});
