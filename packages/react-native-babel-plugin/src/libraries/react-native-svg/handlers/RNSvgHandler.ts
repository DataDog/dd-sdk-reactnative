/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import generate from '@babel/generator';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';

import { getNodeName } from '../../../utils';
import { svgElements, svgSupportedNames, xmlNamespace } from '../constants';
import {
    buildTransformStringAttribute,
    handleArrayAttributes,
    handleJoinedTransformAttributes,
    handleRegularAttributes,
    handleRNSpecificAttributes,
    handleSeparateTransformAttributes,
    handleSvgDimensions,
    validateAttribute
} from '../processing/attributes';
import { convertAttributeCasing } from '../utils';

import type { SvgHandler } from './SvgHandler';

/**
 * Internal handler that transforms React Native–style SVG JSXElements into
 * web-compatible SVG output during Babel processing.
 *
 * The `RNSvgHandler` normalizes tag names and attributes, extracts
 * width/height dimensions, consolidates transform attributes, and ensures
 * correct SVG namespace declarations.
 */
export class RNSvgHandler implements SvgHandler {
    constructor(
        private types: typeof Babel.types,
        private path: Babel.NodePath<Babel.types.JSXElement>,
        private name: string
    ) {
        // no-op
    }

    /**
     * Processes a JSXElement representing an SVG node and transforms it into
     * a web compliant SVG string with updated attributes and dimensions.
     * Stores the transformed SVG string and dimensions in `svgMap`, keyed by a UUID.
     *
     * @param dimensions - Object to collect extracted width/height info.
     * @returns Transformed SVG JSX string, or undefined if the tag is not supported.
     */
    transformSvgNode(dimensions: Record<string, string>) {
        if (!svgSupportedNames.includes(this.name)) {
            return undefined;
        }

        const clone = this.types.cloneNode(this.path.node, true);

        this.transformElement(this.types, this.path, clone, dimensions);
        this.setNamespace(this.types, clone);

        const output = generate(clone).code;

        return output;
    }

    /**
     * Sets the `xmlns` attribute on the root `<svg>` tag to ensure proper namespacing in web output.
     *
     * @param t - Babel types helper.
     * @param el - JSXElement node, expected to be an `<svg>` element.
     */
    private setNamespace(t: typeof Babel.types, el: Babel.types.JSXElement) {
        const name = getNodeName(t, el.openingElement.name);

        if (name === 'svg') {
            el.openingElement.attributes.push(
                jsxAttribute(
                    jSXIdentifier(xmlNamespace[0]),
                    stringLiteral(xmlNamespace[1])
                )
            );
        }
    }

    /**
     * Transforms an individual JSXElement by:
     * - Converting tag casing to be web-compatible.
     * - Processing and sanitizing attributes.
     * - Recursively handling children.
     *
     * @param t - Babel types helper.
     * @param el - JSXElement node to transform.
     * @param dimensions - Optional object to collect extracted width/height info.
     */
    private transformElement(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        el: Babel.types.JSXElement,
        dimensions: Record<string, string>
    ) {
        const openingNode = el.openingElement.name;
        const isJSXIdentifierOpen = t.isJSXIdentifier(openingNode);

        // Fix casing for openingElement
        if (isJSXIdentifierOpen) {
            openingNode.name = convertAttributeCasing(openingNode.name);
            if (!svgElements.has(openingNode.name)) {
                throw new Error(
                    `RNSvgHandler[transformElement]: Failed to transform element: "${openingNode.name}" is not supported`
                );
            }
        }

        const closingNode = el.closingElement?.name;
        const isJSXIdentifierClose = t.isJSXIdentifier(closingNode);

        // Fix casing for closingElement
        if (isJSXIdentifierClose) {
            closingNode.name = convertAttributeCasing(closingNode.name);

            if (!svgElements.has(closingNode.name)) {
                throw new Error(
                    `RNSvgHandler[transformElement]: Failed to transform element: "${closingNode.name}" is not supported`
                );
            }
        }

        this.processAttributes(t, rootElementPath, el, dimensions);
    }

    /**
     * Recursively traverses the children of a JSXElement and applies `transformElement`
     * to each child that is itself a JSXElement.
     *
     * @param t - Babel types helper.
     * @param rootElementPath - The path of the root JSX element containing the SVG.
     *   Used to locate lexical scopes (component or program) for resolving variable references.
     *   May be `null` if no traversal context is available.
     * @param jsxElement - Parent JSXElement whose children will be transformed.
     * @param dimensions - Optional object to propagate width/height info through child elements.
     */
    private traverseAndTransformChildren(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {}
    ) {
        for (const child of jsxElement.children) {
            if (t.isJSXElement(child)) {
                this.transformElement(t, rootElementPath, child, dimensions);
            }
        }
    }

    /**
     * Processes and transforms all attributes of a given JSXElement:
     * - Removes invalid or unsupported attributes.
     * - Normalizes attribute casing and naming.
     * - Consolidates transform-related attributes into a single `transform` string.
     * - Extracts dimensions and stores them in the provided `dimensions` object.
     * - Recursively applies transformations to child elements.
     *
     * @param t - Babel types helper.
     * @param rootElementPath - The path of the root JSX element containing the SVG.
     *   Used to locate lexical scopes (component or program) for resolving variable references.
     *   May be `null` if no traversal context is available.
     * @param jsxElement - JSXElement whose attributes are to be processed.
     * @param dimensions - Optional object to collect extracted width/height info.
     */
    private processAttributes(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {}
    ) {
        const el = jsxElement.openingElement;
        const name = getNodeName(t, el);
        const transformsArray: { name: string; value: string | number }[] = [];
        const attributes = Array.from(el.attributes.entries()).reverse();

        for (const [index, attr] of attributes) {
            try {
                if (!t.isJSXAttribute(attr)) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                if (!t.isJSXIdentifier(attr.name)) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                // Handle RN style attribute & non-supported attributes
                const rnAttributesHandled = handleRNSpecificAttributes(
                    t,
                    attr,
                    attr.name.name,
                    transformsArray
                );

                if (rnAttributesHandled) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                // Validate whether the attribute is valid
                const { attrName, isInvalidAttribute } = validateAttribute(
                    attr.name.name
                );

                if (isInvalidAttribute) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                /* If we reach this point we know we have a valid attribute name */

                // Handle SVG dimensions

                const {
                    resolved: dimensionsHandled,
                    remove: removeDimension
                } = handleSvgDimensions(
                    t,
                    rootElementPath,
                    attr,
                    attrName,
                    dimensions,
                    name,
                    'svg'
                );

                if (dimensionsHandled) {
                    // If dimension is invalid or if it's a variable that was not initialized in the file
                    // We remove the attribute and assign a value in the native layer where we have access to wireframe's dimensions
                    if (removeDimension) {
                        el.attributes.splice(index, 1);
                    }
                    continue;
                }

                // Set the formatted attibute name to our cloned element
                attr.name.name = attrName;

                // Handle array attributes
                const arrayAttributesHandled = handleArrayAttributes(
                    t,
                    attr,
                    attrName
                );

                if (arrayAttributesHandled) {
                    continue;
                }

                // Handle separate transform attributes
                const separateTransformAttributesHandled = handleSeparateTransformAttributes(
                    t,
                    attr,
                    attrName,
                    transformsArray
                );

                if (separateTransformAttributesHandled) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                // Handle joined transform attributes
                const joinedTransformAttributesHandled = handleJoinedTransformAttributes(
                    t,
                    attr,
                    attrName,
                    transformsArray
                );

                if (joinedTransformAttributesHandled) {
                    el.attributes.splice(index, 1);
                    continue;
                }

                handleRegularAttributes(t, attr);
            } catch (error) {
                console.error('ReactNativeSVG[processAttributes]: ', error);
            }
        }

        // Create & Set a new transform attribute based on the element's transform attributes
        buildTransformStringAttribute(el, transformsArray);

        // Goes through an elements children and transforms its properties
        this.traverseAndTransformChildren(t, null, jsxElement, dimensions);
    }
}
