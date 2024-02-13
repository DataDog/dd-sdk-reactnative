/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    ShapeBorder,
    ShapeStyle,
    ShapeWireframe,
    TextPosition,
    TextStyle,
    TextWireframe,
    Wireframe,
    WireframeClip
} from 'rum-events-format';

export const mockSessionReplayWireframe = (
    wireframe:
        | {
              type: 'shape';
              border?: ShapeBorder;
              clip?: WireframeClip;
              height?: number;
              shapeStyle?: ShapeStyle;
              width?: number;
              x?: number;
              y?: number;
          }
        | {
              type: 'text';
              text: string;
              border?: ShapeBorder;
              clip?: WireframeClip;
              height?: number;
              shapeStyle?: ShapeStyle;
              textPosition?: TextPosition;
              textStyle: TextStyle;
              width?: number;
              x?: number;
              y?: number;
          }
): Wireframe => {
    if (wireframe.type === 'text') {
        // This is not optimal but guarantee typing works
        const { type, ...rest } = wireframe;
        return mockTextWireframe(rest);
    }
    const { type, ...rest } = wireframe;
    return mockShapeWireframe(rest);
};

const mockTextWireframe = ({
    text,
    textStyle,
    textPosition,
    border,
    shapeStyle,
    clip,
    width,
    height,
    x,
    y
}: {
    text: string;
    border?: ShapeBorder;
    clip?: WireframeClip;
    height?: number;
    shapeStyle?: ShapeStyle;
    textPosition?: TextPosition;
    textStyle?: TextStyle;
    width?: number;
    x?: number;
    y?: number;
}): TextWireframe => {
    return {
        type: 'text',
        text,
        textStyle,
        textPosition,
        border,
        shapeStyle,
        clip,
        height,
        width,
        x,
        y
    } as TextWireframe;
};

const mockShapeWireframe = ({
    shapeStyle,
    border,
    clip,
    width,
    height,
    x,
    y
}: {
    border?: ShapeBorder;
    clip?: WireframeClip;
    height?: number;
    shapeStyle?: ShapeStyle;
    width?: number;
    x?: number;
    y?: number;
}): ShapeWireframe => {
    return {
        type: 'shape',
        border,
        shapeStyle,
        clip,
        height,
        width,
        x,
        y
    } as ShapeWireframe;
};
