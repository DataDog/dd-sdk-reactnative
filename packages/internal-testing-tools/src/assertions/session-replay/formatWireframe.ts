/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    ImageWireframe,
    ShapeWireframe,
    TextWireframe,
    WebviewWireframe,
    Wireframe
} from 'rum-events-format';

export const formatWireframe = <WireframeType extends Wireframe>(
    wireframe: WireframeType
): WireframeType => {
    const result = { ...wireframe };

    if (wireframeHasShapeStyle(result) && result.shapeStyle?.backgroundColor) {
        result.shapeStyle = {
            ...result.shapeStyle,
            backgroundColor: result.shapeStyle.backgroundColor.toUpperCase()
        };
    }

    if (wireframeHasTextStyle(result) && result.textStyle.color) {
        result.textStyle = {
            ...result.textStyle,
            color: result.textStyle.color.toUpperCase()
        };
    }

    return result;
};

const wireframeHasShapeStyle = (
    wireframe: Wireframe
): wireframe is
    | TextWireframe
    | ShapeWireframe
    | ImageWireframe
    | WebviewWireframe => {
    return ['text', 'shape', 'image', 'webview'].includes(wireframe.type);
};

const wireframeHasTextStyle = (
    wireframe: Wireframe
): wireframe is TextWireframe => {
    return ['text'].includes(wireframe.type);
};
