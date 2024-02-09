/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { TextWireframe } from 'rum-events-format';

import { buildWireframesAssertions } from '../wireframesAssertions';

import { mockSessionReplayWireframe } from './__utils__/wireframes.mock';

const wireframeMock = mockSessionReplayWireframe({
    type: 'shape',
    border: {
        color: 'red',
        width: 2
    },
    clip: {
        top: 1,
        bottom: 2,
        left: 3,
        right: 4
    },
    height: 200,
    shapeStyle: {
        backgroundColor: 'blue',
        opacity: 0.5,
        cornerRadius: 4
    },
    width: 300,
    x: 22,
    y: 33
}) as TextWireframe;

describe('textWireframeAssertions', () => {
    describe('toHaveWireframeWithStyle', () => {
        it('does not throw if matching style is found', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    border: {
                        color: 'red',
                        width: 2
                    },
                    clip: {
                        top: 1,
                        bottom: 2,
                        left: 3,
                        right: 4
                    },
                    height: 200,
                    shapeStyle: {
                        backgroundColor: 'blue',
                        opacity: 0.5,
                        cornerRadius: 4
                    },
                    width: 300,
                    x: 22,
                    y: 33
                })
            ).not.toThrow();

            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({})
            ).not.toThrow();
        });
        it('throws if border does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    border: {
                        color: 'blue',
                        width: 2
                    }
                })
            ).toThrow();
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    border: {
                        color: 'red',
                        width: 18
                    }
                })
            ).toThrow();
        });
        it('throws if clip does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    clip: {}
                })
            ).toThrow();
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    clip: {
                        top: 1,
                        bottom: 2,
                        left: 3,
                        right: 5
                    }
                })
            ).toThrow();
        });
        it('throws if shapeStyle does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    shapeStyle: {}
                })
            ).toThrow();
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    shapeStyle: {
                        backgroundColor: 'red'
                    }
                })
            ).toThrow();
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    shapeStyle: {
                        backgroundColor: 'blue',
                        opacity: 1
                    }
                })
            ).toThrow();
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    shapeStyle: {
                        backgroundColor: 'blue',
                        opacity: 0.5,
                        cornerRadius: 99
                    }
                })
            ).toThrow();
        });
        it('throws if height does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    height: 77
                })
            ).toThrow();
        });
        it('throws if width does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    width: 77
                })
            ).toThrow();
        });
        it('throws if x does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    x: 77
                })
            ).toThrow();
        });
        it('throws if y does not match', () => {
            expect(() =>
                buildWireframesAssertions([
                    wireframeMock
                ]).toHaveWireframeWithStyle({
                    y: 77
                })
            ).toThrow();
        });
    });
});
