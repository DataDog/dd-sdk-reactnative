/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import isEqual from 'lodash.isequal';
import type {
    ShapeBorder,
    ShapeStyle,
    TextPosition,
    TextStyle,
    TextWireframe,
    WireframeClip
} from 'rum-events-format';

import { AssertionError } from '../assertionError';

export const buildTextWireframeAssertions = (wireframe: TextWireframe) => ({
    toHaveStyle: ({
        border,
        clip,
        height,
        shapeStyle,
        textPosition,
        textStyle,
        width,
        x,
        y
    }: {
        border?: ShapeBorder;
        clip?: WireframeClip;
        height?: number;
        shapeStyle?: ShapeStyle;
        textPosition?: TextPosition;
        textStyle?: TextStyle;
        width?: number;
        x?: number;
        y?: number;
    }) => {
        if (border !== undefined && !isEqual(border, wireframe.border)) {
            throw new AssertionError(
                'Text Wireframe does not have matching border.',
                JSON.stringify(border),
                JSON.stringify(wireframe.border),
                wireframe
            );
        }

        if (
            clip !== undefined &&
            !isEqual(
                clip as Record<string, number>,
                wireframe.clip as Record<string, number>
            )
        ) {
            throw new AssertionError(
                'Text Wireframe does not have matching clip.',
                JSON.stringify(clip),
                JSON.stringify(wireframe.clip),
                wireframe
            );
        }

        if (
            shapeStyle !== undefined &&
            !isEqual(shapeStyle, wireframe.shapeStyle)
        ) {
            throw new AssertionError(
                'Text Wireframe does not have matching shapeStyle.',
                JSON.stringify(shapeStyle),
                JSON.stringify(wireframe.shapeStyle),
                wireframe
            );
        }

        if (
            textPosition !== undefined &&
            !isEqual(textPosition, wireframe.textPosition)
        ) {
            throw new AssertionError(
                'Text Wireframe does not have matching textPosition.',
                JSON.stringify(textPosition),
                JSON.stringify(wireframe.textPosition),
                wireframe
            );
        }

        if (
            textStyle !== undefined &&
            !isEqual(textStyle, wireframe.textStyle)
        ) {
            throw new AssertionError(
                'Text Wireframe does not have matching textStyle.',
                JSON.stringify(textStyle),
                JSON.stringify(wireframe.textStyle),
                wireframe
            );
        }

        if (height !== undefined && height !== wireframe.height) {
            throw new AssertionError(
                'Text Wireframe does not have matching height.',
                JSON.stringify(height),
                JSON.stringify(wireframe.height),
                wireframe
            );
        }
        if (width !== undefined && width !== wireframe.width) {
            throw new AssertionError(
                'Text Wireframe does not have matching width.',
                JSON.stringify(width),
                JSON.stringify(wireframe.width),
                wireframe
            );
        }
        if (x !== undefined && x !== wireframe.x) {
            throw new AssertionError(
                'Text Wireframe does not have matching x.',
                JSON.stringify(x),
                JSON.stringify(wireframe.x),
                wireframe
            );
        }
        if (y !== undefined && y !== wireframe.y) {
            throw new AssertionError(
                'Text Wireframe does not have matching y.',
                JSON.stringify(y),
                JSON.stringify(wireframe.y),
                wireframe
            );
        }
    }
});
