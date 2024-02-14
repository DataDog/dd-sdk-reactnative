/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ShapeWireframe, TextWireframe } from 'rum-events-format';

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
                    mockSessionReplayWireframe({ type: 'shape', id: 1 }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 2,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
                    })
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

        it('only reports wireframes the first time they appear in a full snapshot', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'shape', id: 1 })
                ]
            });

            const wireframes = findViewWireframes(
                'shape',
                [segmentMock, segmentMock],
                [viewMock],
                {
                    viewName: 'Main'
                }
            );
            expect(wireframes).toHaveLength(1);
        });

        it('throws if no wireframe matches criteria', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({ type: 'shape', id: 1 })
                ]
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
                wireframes: [
                    mockSessionReplayWireframe({ type: 'shape', id: 1 })
                ]
            });

            expect(() =>
                findViewWireframes('shape', [segmentMock], [viewMock], {
                    viewName: 'About'
                })
            ).toThrow();
        });

        it('formats wireframes to have consistent casing for colors', () => {
            const viewID = 'view-id';
            const viewMock = mockRumViewForSessionReplay({
                name: 'Main',
                id: viewID
            });
            const segmentMock = mockSessionReplayFullSnapshotSegment({
                viewID,
                wireframes: [
                    mockSessionReplayWireframe({
                        type: 'shape',
                        id: 1,
                        shapeStyle: { backgroundColor: '#abcdef00' }
                    }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 2,
                        textStyle: { color: '#abcdef00', size: 20, family: '' }
                    })
                ]
            });

            const foundShapeWireframes = findViewWireframes(
                'shape',
                [segmentMock],
                [viewMock],
                {
                    viewName: 'Main'
                }
            ) as ShapeWireframe[];
            const foundTextWireframes = findViewWireframes(
                'text',
                [segmentMock],
                [viewMock],
                {
                    viewName: 'Main'
                }
            ) as TextWireframe[];

            expect(foundShapeWireframes[0].shapeStyle?.backgroundColor).toBe(
                '#ABCDEF00'
            );
            expect(foundTextWireframes[0].textStyle.color).toBe('#ABCDEF00');
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
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 1,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
                    }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'something else',
                        id: 2,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
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
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 1,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
                    })
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
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 1,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
                    }),
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock too',
                        id: 2,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
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
                    mockSessionReplayWireframe({
                        type: 'text',
                        text: 'mock',
                        id: 1,
                        textStyle: {
                            color: '',
                            size: 20,
                            family: ''
                        }
                    })
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
