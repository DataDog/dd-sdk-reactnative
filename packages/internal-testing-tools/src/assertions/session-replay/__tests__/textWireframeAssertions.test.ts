/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { TextWireframe } from 'rum-events-format';

import { buildTextWireframeAssertions } from '../textWireframeAssertions';

import { mockSessionReplayWireframe } from './__utils__/wireframes.mock';

const wireframeMock = mockSessionReplayWireframe({
    type: 'text',
    text: 'mock',
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
    textPosition: {
        padding: {
            top: 1,
            bottom: 2,
            left: 3,
            right: 4
        },
        alignment: {
            horizontal: 'left',
            vertical: 'top'
        }
    },
    textStyle: {
        family: 'Comic Sans MS',
        size: 23,
        color: 'black'
    },
    width: 300,
    x: 22,
    y: 33
}) as TextWireframe;
describe('textWireframeAssertions', () => {
    describe('toHaveStyle', () => {
        it('does not throw if matching style is found', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
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
                    textPosition: {
                        padding: {
                            top: 1,
                            bottom: 2,
                            left: 3,
                            right: 4
                        },
                        alignment: {
                            horizontal: 'left',
                            vertical: 'top'
                        }
                    },
                    textStyle: {
                        family: 'Comic Sans MS',
                        size: 23,
                        color: 'black'
                    },
                    width: 300,
                    x: 22,
                    y: 33
                })
            ).not.toThrow();

            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({})
            ).not.toThrow();
        });
        it('throws if border does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    border: {
                        color: 'blue',
                        width: 2
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    border: {
                        color: 'red',
                        width: 18
                    }
                })
            ).toThrow();
        });
        it('throws if clip does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    clip: {}
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
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
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    shapeStyle: {}
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    shapeStyle: {
                        backgroundColor: 'red'
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    shapeStyle: {
                        backgroundColor: 'blue',
                        opacity: 1
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    shapeStyle: {
                        backgroundColor: 'blue',
                        opacity: 0.5,
                        cornerRadius: 99
                    }
                })
            ).toThrow();
        });
        it('throws if textPosition does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textPosition: {}
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textPosition: {
                        padding: {},
                        alignment: {}
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textPosition: {
                        padding: {
                            top: 1,
                            bottom: 1,
                            left: 1,
                            right: 1
                        },
                        alignment: {
                            horizontal: 'left',
                            vertical: 'top'
                        }
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textPosition: {
                        padding: {
                            top: 1,
                            bottom: 2,
                            left: 3,
                            right: 4
                        },
                        alignment: {
                            horizontal: 'left',
                            vertical: 'bottom'
                        }
                    }
                })
            ).toThrow();
        });
        it('throws if textStyle does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textStyle: {
                        family: 'Arial',
                        size: 23,
                        color: 'black'
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textStyle: {
                        family: 'Comic Sans MS',
                        size: 25,
                        color: 'black'
                    }
                })
            ).toThrow();
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textStyle: {
                        family: 'Comic Sans MS',
                        size: 23,
                        color: 'red'
                    }
                })
            ).toThrow();
        });
        it('throws if height does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    height: 77
                })
            ).toThrow();
        });
        it('throws if width does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    width: 77
                })
            ).toThrow();
        });
        it('throws if x does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    x: 77
                })
            ).toThrow();
        });
        it('throws if y does not match', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    y: 77
                })
            ).toThrow();
        });
    });
});
