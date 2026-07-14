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
    parseStyleNode,
    findIdentifierInScope,
    getNodeName
} from '../../../utils/nodeProcessing';
import {
    rnAttributeNames,
    rnSvgArrayAttributeValues,
    rnSvgTransformAttributeValues,
    svgAttributesCC,
    svgAttributesKC,
    svgElements
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
 * Extracts transform properties from style objects and adds them to the transforms array.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node to process.
 * @param attrName - Name of the attribute (e.g., 'style').
 * @param transformsArray - Optional array to collect transform operations from style objects.
 * @returns True if the attribute was handled (and should be removed), false otherwise.
 */
export function handleRNSpecificAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    transformsArray: { name: string; value: string | number }[] = []
) {
    if (rnAttributeNames.has(attrName)) {
        if (attrName === 'style') {
            const styleObj = parseStyleNode(t, attr);
            if (styleObj) {
                // Extract transform properties and add to transforms array
                const transformProps = [
                    'translateX',
                    'translateY',
                    'scaleX',
                    'scaleY',
                    'rotate',
                    'skewX',
                    'skewY'
                ];

                for (const prop of transformProps) {
                    if (styleObj[prop] != null) {
                        transformsArray.push({
                            name: prop,
                            value: styleObj[prop]
                        });
                        delete styleObj[prop];
                    }
                }

                // Convert remaining (non-transform) properties to CSS
                const cssObj = convertStyleObjToCssObj(styleObj);
                const styleString = Object.entries(cssObj)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(';');

                if (styleString) {
                    attr.value = t.stringLiteral(styleString);
                    return false; // Keep the style attribute
                }

                // If no CSS properties remain, the style should be removed
                return true;
            }

            return true;
        }
    }

    return false;
}

export function isSupportedSvgElement(name: string): boolean {
    return svgElements.has(name);
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

    if (rnSvgTransformAttributeValues.has(attrName)) {
        return result;
    }

    // This means that the attribute name is already in the right format
    if (!svgAttributesCC.has(attrName)) {
        result.attrName = kebabCase(attrName);

        // This means that the attribute name is not a valid SVG attribute and should be ignored
        if (!svgAttributesKC.has(result.attrName)) {
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
 * @param rootElementPath - The path of the root JSX element containing the SVG.
 *   Used to locate lexical scopes (component or program) for resolving variable references.
 *   May be `null` if no traversal context is available.
 * @param attr - JSX attribute node (e.g., width or height).
 * @param attrName - Name of the attribute.
 * @param dimensions - Object to collect dimension key/value pairs.
 * @param nodeName - Tag name (should be 'svg').
 * @returns An object describing the result of the operation:
 * - `resolved`: `true` if the attribute was processed (even if unresolved or removed).
 * - `remove`: `true` if the attribute should be removed from the AST (unresolved variable or fallback case).
 */
export function handleSvgDimensions(
    t: typeof Babel.types,
    rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    dimensions: Record<string, string> = {},
    nodeName: string | null,
    expectedName: string
) {
    const dimensionAttributes = ['width', 'height'];

    // Early exit for irrelevant attributes
    if (nodeName !== expectedName || !dimensionAttributes.includes(attrName)) {
        return { resolved: false, remove: false };
    }

    const setDimension = (value: string) => {
        attr.value = t.stringLiteral(value);
        dimensions[attrName] = value;
    };

    const val = attr.value;

    // Handle expression container (e.g., width={widthVal})
    if (t.isJSXExpressionContainer(val) && t.isIdentifier(val.expression)) {
        const variableName = getNodeName(t, val.expression);
        let resolvedValue: string | number | null = null;

        // If no root element, fallback immediately
        if (!rootElementPath) {
            return { resolved: true, remove: false };
        }

        // Try to find a variable in the nearest component/function/class scope
        const componentPath = rootElementPath.findParent(
            p =>
                p.isFunctionDeclaration() ||
                p.isArrowFunctionExpression() ||
                p.isFunctionExpression() ||
                p.isClassDeclaration()
        );

        if (componentPath && variableName) {
            resolvedValue = findIdentifierInScope(
                t,
                componentPath,
                variableName
            );
        }

        // If not found, check the program (global) scope
        if (resolvedValue === null && variableName) {
            const programPath = rootElementPath.findParent(p => p.isProgram());
            if (programPath) {
                resolvedValue = findIdentifierInScope(
                    t,
                    programPath,
                    variableName
                );
            }
        }

        // Use resolved value or fallback
        if (resolvedValue != null) {
            setDimension(resolvedValue.toString());
            return { resolved: true, remove: false };
        } else {
            return { resolved: true, remove: true };
        }
    }

    // Handle static JSX attribute values
    const result = getJSXAttributeData(t, attr);
    if (result.value) {
        setDimension(result.value.toString());
        return { resolved: true, remove: false };
    }

    // Default fallback if unrecognized case
    return { resolved: true, remove: true };
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
        rnSvgArrayAttributeValues.has(attrName) &&
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
    if (rnSvgTransformAttributeValues.has(attrName)) {
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
export function handleJoinedTransformAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute,
    attrName: string,
    transformsArray: { name: string; value: string | number }[] = []
) {
    if (
        attrName !== 'transform' ||
        !t.isJSXExpressionContainer(attr.value) ||
        !t.isArrayExpression(attr.value.expression)
    ) {
        return false;
    }

    const transformList = evaluateStaticNode(t, attr.value.expression);

    if (!Array.isArray(transformList)) {
        return false;
    }

    for (const entry of transformList) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }

        for (const key of Object.keys(entry)) {
            transformsArray.push({
                name: key,
                value: entry[key]
            });
        }
    }

    return true;
}

/**
 * Converts a standard JSX attribute (e.g., `stroke`, `fill`, `opacity`) to a string literal
 * if it holds a statically resolvable value. Attributes whose value can't be resolved at
 * build time (e.g. `fill={color}`) are left untouched — the plugin doesn't attempt to guess
 * or drop them; that's handled separately, on the native side, once the runtime value is
 * known.
 *
 * @param t - Babel types helper.
 * @param attr - JSX attribute node.
 */
export function handleRegularAttributes(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute
): void {
    const result = getJSXAttributeData(t, attr);

    // !== null, not truthiness: 0/''/false (e.g. opacity={0}) are valid resolved values.
    if (result.value !== null) {
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
