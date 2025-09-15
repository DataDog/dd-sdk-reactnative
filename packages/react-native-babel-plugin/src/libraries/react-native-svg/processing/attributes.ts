/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';

import {
    evaluateStaticNode,
    getJSXAttributeData,
    parseStyleNode
} from '../../../utils/nodeProcessing';
import {
    rnAttributeNames,
    rnSvgArrayAttributeValues,
    rnSvgTransformAttributeValues,
    svgAttributesCC,
    svgAttributesKC
} from '../constants';
import { convertStyleObjToCssObj, kebabCase } from '../utils';

import {
    convertAttributeArrayValue,
    convertAttributeTransformArray,
    convertTransformArrayToString
} from './svg';

/**
 * Handles React Native–specific attributes that are not directly supported in web SVG.
 * Currently processes the `style` attribute by converting it to a flat inline CSS string.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node to process.
 * @param attrName - Name of the attribute (e.g., 'style').
 * @returns True if the attribute was handled (and should be removed), false otherwise.
 */
export function handleRNSpecificAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string
) {
    if (rnAttributeNames.includes(attrName)) {
        if (attrName === 'style') {
            const styleObj = parseStyleNode(t, attr);
            if (styleObj) {
                const cssObj = convertStyleObjToCssObj(styleObj);
                const styleString = Object.entries(cssObj)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';');

                if (styleString) {
                    attr.value = t.stringLiteral(styleString);
                    return true;
                }
            }

            return true;
        }
    }

    return false;
}

/**
 * Validates and normalizes an attribute name for use in web SVG:
 * - Converts camelCase to kebab-case if needed.
 * - Flags attributes not included in the allowed SVG attribute list.
 *
 * @param attrName - Name of the attribute to process.
 * @returns An object with the normalized name and a flag indicating invalidity.
 */
export function validateAttribute(attrName: string) {
    const result = { attrName, isInvalidAttribute: false };

    if (rnSvgTransformAttributeValues.includes(attrName)) {
        return result;
    }

    // This means that the attribute name is already in the right format
    if (!svgAttributesCC.includes(attrName)) {
        result.attrName = kebabCase(attrName);

        // This means that the attribute name is not a valid SVG attribute and should be ignored
        if (!svgAttributesKC.includes(attrName)) {
            result.isInvalidAttribute = true;
        }
    }

    return result;
}

/**
 * Extracts and serializes width/height values from `<svg>` elements,
 * adding them to the provided `dimensions` object.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node (e.g., width or height).
 * @param attrName - Name of the attribute.
 * @param dimensions - Object to collect dimension key/value pairs.
 * @param nodeName - Tag name (should be 'svg').
 * @returns True if the attribute was handled and should be removed, false otherwise.
 */
export function handleSvgDimensions(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    dimensions: Record<string, string> = {},
    nodeName: string | null,
    expectedName: string
) {
    if (nodeName !== expectedName) {
        return false;
    }

    const dimensionAttributes = ['width', 'height'];

    if (dimensionAttributes.includes(attrName)) {
        const result = getJSXAttributeData(t, attr);

        // IMPROVEMENT: If it's a variable try to find it in the closure
        if (result.value) {
            attr.value = t.stringLiteral(result.value.toString());
            dimensions[attrName] = attr.value.value;
            return false;
        }
    }

    return true;
}

/**
 * Converts JSX array-based attributes (e.g., `points`, `values`) into string literals
 * for valid SVG usage.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node to process.
 * @param attrName - Name of the attribute (e.g., 'points').
 * @returns True if the attribute was converted, false otherwise.
 */
export function handleArrayAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string
) {
    if (
        rnSvgArrayAttributeValues.includes(attrName) &&
        t.isJSXExpressionContainer(attr.value) &&
        t.isArrayExpression(attr.value.expression)
    ) {
        const result = convertAttributeArrayValue(
            t,
            attr.value.expression,
            attrName
        );

        if (result) {
            attr.value = t.stringLiteral(result);
            return true;
        }
    }
    return false;
}

/**
 * Handles transform-related attributes (e.g., `translateX`, `scaleY`) that are passed
 * separately as individual props. Extracts them and stores in the transforms array.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node.
 * @param attrName - Name of the transform attribute.
 * @param transformsArray - Accumulator array for transform operations.
 * @returns True if the attribute was handled and added to transforms array.
 */
export function handleSeparateTransformAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    transformsArray: { name: string; value: string | number }[] = []
) {
    if (rnSvgTransformAttributeValues.includes(attrName)) {
        convertAttributeTransformArray(t, transformsArray, attr);
        return true;
    }

    return false;
}

/**
 * Handles a single `transform` JSX attribute that holds an array of transform objects
 * (e.g., [{ translateX: 10 }, { rotate: '90deg' }]).
 * Converts it into discrete transform operations and stores in the transforms array.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node with `transform` key.
 * @param attrName - Name of the attribute (should be 'transform').
 * @param transformsArray - Accumulator array for transform operations.
 * @returns True if the transform list was extracted successfully.
 */
export function handleJoinedTranformAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    transformsArray: { name: string; value: string | number }[] = []
) {
    if (
        attrName === 'transform' &&
        t.isJSXExpressionContainer(attr.value) &&
        t.isArrayExpression(attr.value.expression)
    ) {
        const transformList = evaluateStaticNode(t, attr.value.expression);

        if (Array.isArray(transformList)) {
            for (const entry of transformList) {
                if (
                    entry &&
                    typeof entry === 'object' &&
                    !Array.isArray(entry)
                ) {
                    for (const key of Object.keys(entry)) {
                        transformsArray.push({
                            name: key,
                            value: entry[key]
                        });
                    }
                }
            }
            return true;
        }
    }
    return false;
}

/**
 * Converts a standard JSX attribute (e.g., `stroke`, `fill`, `opacity`) to a string literal
 * if it holds a valid value.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node.
 */
export function handleRegularAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute
) {
    const result = getJSXAttributeData(t, attr);

    if (result.value) {
        attr.value = t.stringLiteral(result.value.toString());
    }
}

/**
 * Builds a final `transform` string from all accumulated transform operations,
 * and pushes it as a new attribute into the JSXOpeningElement.
 *
 * @param el - JSXOpeningElement where the `transform` attribute will be added.
 * @param transformsArray - Array of parsed transform operations.
 */
export function buildTransformStringAttribute(
    el: Babel.types.JSXOpeningElement,
    transformsArray: { name: string; value: string | number }[] = []
) {
    if (transformsArray.length) {
        const transformAttrString = convertTransformArrayToString(
            transformsArray
        );

        if (transformAttrString) {
            el.attributes.push(
                jsxAttribute(
                    jSXIdentifier('transform'),
                    stringLiteral(transformAttrString)
                )
            );
        }
    }
}
