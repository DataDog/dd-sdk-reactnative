/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import isEqual from 'lodash.isequal';
import type {
    ShapeBorder,
    ShapeStyle,
    Wireframe,
    WireframeClip
} from 'rum-events-format';

import { AssertionError } from '../assertionError';

export const buildWireframesAssertions = (wireframes: Wireframe[]) => ({
    toHaveWireframeWithStyle: (style: {
        border?: ShapeBorder;
        clip?: WireframeClip;
        height?: number;
        shapeStyle?: ShapeStyle;
        width?: number;
        x?: number;
        y?: number;
    }) => {
        const { border, clip, height, shapeStyle, width, x, y } = style;
        const matchingWireframes = wireframes.filter(wireframe => {
            if (border !== undefined) {
                if (wireframe.type === 'placeholder') {
                    // Border does not exist for placeholder wireframes
                    return false;
                }
                if (!isEqual(border, wireframe.border)) {
                    return false;
                }
            }
            if (
                clip !== undefined &&
                !isEqual(
                    clip as Record<string, number>,
                    wireframe.clip as Record<string, number>
                )
            ) {
                return false;
            }
            if (shapeStyle !== undefined) {
                if (wireframe.type === 'placeholder') {
                    // shapeStyle does not exist for placeholder wireframes
                    return false;
                }
                if (!isEqual(shapeStyle, wireframe.shapeStyle)) {
                    return false;
                }
            }

            if (height !== undefined && height !== wireframe.height) {
                return false;
            }
            if (width !== undefined && width !== wireframe.width) {
                return false;
            }
            if (x !== undefined && x !== wireframe.x) {
                return false;
            }
            if (y !== undefined && y !== wireframe.y) {
                return false;
            }
            return true;
        });

        if (matchingWireframes.length === 0) {
            throw new AssertionError(
                'Could not find wireframe matching style',
                JSON.stringify(style),
                undefined,
                wireframes
            );
        }
    }
});
