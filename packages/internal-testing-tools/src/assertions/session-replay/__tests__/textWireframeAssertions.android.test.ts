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
    }
}) as TextWireframe;

jest.mock('react-native', () => {
    return {
        Platform: {
            select: (options: any) => options.android
        }
    };
});

describe('textWireframeAssertions on Android', () => {
    describe('toHaveStyle', () => {
        it('does not throw if the padding is correct within a margin of error', () => {
            expect(() =>
                buildTextWireframeAssertions(wireframeMock).toHaveStyle({
                    textPosition: {
                        padding: {
                            top: 2,
                            bottom: 1,
                            left: 3,
                            right: 5
                        },
                        alignment: {
                            horizontal: 'left',
                            vertical: 'top'
                        }
                    }
                })
            ).not.toThrow();
        });
    });
});
