/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { getJSXAttributeData } from '../../../utils/nodeProcessing';

/**
 * Converts a Babel ArrayExpression from a JSX attribute into a string suitable for SVG.
 * The conversion is based on the SVG attribute name, e.g. `points`, `values`, or `matrix`.
 *
 * @param t - Babel types helper.
 * @param expression - Babel AST ArrayExpression node.
 * @param attrName - Name of the attribute (e.g., 'points', 'matrix').
 * @returns A formatted string for the attribute value, or null if unsupported.
 */
export function convertAttributeArrayValue(
    t: typeof Babel.types,
    expression: Babel.types.ArrayExpression,
    attrName: string
) {
    const value = convertArrayExpressionToArray(t, expression, []);

    if (Array.isArray(value)) {
        switch (attrName) {
            case 'gradientTransform':
            case 'matrix':
                return `matrix(${value.join(' ')})`;

            case 'values':
                return value.join(';');

            case 'points': {
                const data = value
                    .map(v => (Array.isArray(v) ? v.join(',') : v))
                    .join(' ');

                return data;
            }

            default:
                return value.join(' ');
        }
    }

    return null;
}

/**
 * Recursively converts a Babel ArrayExpression into a flat or nested string array
 * depending on the content, supporting numbers, strings, unary expressions, and simple templates.
 *
 * @param t - Babel types helper.
 * @param expression - Babel AST ArrayExpression node to convert.
 * @param data - Initial accumulator array (flat or nested).
 * @returns A string array (or nested string array) representing the array literal.
 */
export function convertArrayExpressionToArray(
    t: typeof Babel.types,
    expression: Babel.types.ArrayExpression,
    data: string[] | string[][]
): typeof data {
    for (const element of expression.elements) {
        if (!element) {
            continue;
        }

        // Used when targeting nested arrays
        if (t.isArrayExpression(element)) {
            const nested = convertArrayExpressionToArray(t, element, []);
            (data as string[][]).push(nested as string[]);
            continue;
        }

        // Used when targeting numeric values
        if (t.isNumericLiteral(element)) {
            (data as string[]).push(element.value.toString());
            continue;
        }

        // Used when targeting string values
        if (t.isStringLiteral(element)) {
            (data as string[]).push(element.value);
            continue;
        }

        // Used when targeting negative/positive signed values
        if (
            t.isUnaryExpression(element) &&
            t.isNumericLiteral(element.argument)
        ) {
            if (element.operator === '-') {
                (data as string[]).push(`-${element.argument.value}`);
            } else {
                (data as string[]).push(`${element.argument.value}`);
            }
            continue;
        }

        // Used when targeting string templates (``)
        if (
            t.isTemplateLiteral(element) &&
            element.quasis.length === 1 &&
            element.expressions.length === 0
        ) {
            const { cooked } = element.quasis[0].value;
            if (cooked) {
                (data as string[]).push(cooked);
            }
            continue;
        }

        // Ignore unsupported elements (identifiers, spreads)
        console.warn(
            '[convertArrayExpressionToArray] Unsupported array element in SVG prop:',
            element
        );
    }

    return data;
}

/**
 * Extracts name/value data from a JSX transform-related attribute and appends it
 * to the provided transforms array for later stringification.
 *
 * @param t - Babel types helper.
 * @param transformsArray - Accumulator array collecting transform operations.
 * @param attr Babel JSXAttribute node.
 */
export function convertAttributeTransformArray(
    t: typeof Babel.types,
    transformsArray: { name: string; value: string | number }[],
    attr: Babel.types.JSXAttribute
) {
    const data = getJSXAttributeData(t, attr);
    if (data.name && data.value) {
        transformsArray.push(data as typeof transformsArray[0]);
    }
}

/**
 * Converts an array of parsed transform operations into a single SVG-compliant
 * `transform` string (e.g., "translate(10, 20) scale(2, 2)").
 *
 * Supports standard transform keys such as:
 * - translateX / translateY
 * - scaleX / scaleY
 * - rotate
 * - skewX / skewY
 * - matrix
 *
 * @param transformsArray - Array of transform operations with name/value pairs.
 * @returns - Formatted `transform` string, or undefined if no transforms are present.
 */
export function convertTransformArrayToString(
    transformsArray: { name: string; value: string | number }[]
): string | undefined {
    const transforms: string[] = [];

    const get = (key: string) =>
        transformsArray.find(t => t.name === key)?.value;

    const tx = get('translateX');
    const ty = get('translateY');
    if (tx !== undefined && ty !== undefined) {
        transforms.push(`translate(${tx}, ${ty})`);
    } else if (tx !== undefined) {
        transforms.push(`translate(${tx})`);
    } else if (ty !== undefined) {
        transforms.push(`translate(0, ${ty})`);
    }

    const sx = get('scaleX');
    const sy = get('scaleY');
    if (sx !== undefined && sy !== undefined) {
        transforms.push(`scale(${sx}, ${sy})`);
    } else if (sx !== undefined) {
        transforms.push(`scale(${sx})`);
    } else if (sy !== undefined) {
        transforms.push(`scale(1, ${sy})`);
    }

    const rot = get('rotate');
    if (rot !== undefined) {
        const value = typeof rot === 'string' ? rot.replace(/deg$/, '') : rot;
        transforms.push(`rotate(${value})`);
    }

    const skewX = get('skewX');
    if (skewX !== undefined) {
        const value =
            typeof skewX === 'string' ? skewX.replace(/deg$/, '') : skewX;
        transforms.push(`skewX(${value})`);
    }

    const skewY = get('skewY');
    if (skewY !== undefined) {
        const value =
            typeof skewY === 'string' ? skewY.replace(/deg$/, '') : skewY;
        transforms.push(`skewY(${value})`);
    }

    const matrix = get('matrix');
    if (Array.isArray(matrix) && matrix.length === 6) {
        const matrixValues = matrix.map(v => v.toString()).join(' ');
        transforms.push(`matrix(${matrixValues})`);
    }

    return transforms.length ? transforms.join(' ') : undefined;
}
