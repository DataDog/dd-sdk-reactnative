/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import generate from '@babel/generator';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';
import { v4 as uuidv4 } from 'uuid';

import { getNodeName } from '../../utils';

import { svgSupportedNames, xmlNamespace } from './constants';
import {
    buildTransformStringAttribute,
    handleArrayAttributes,
    handleJoinedTranformAttributes,
    handleRegularAttributes,
    handleRNSpecificAttributes,
    handleSeparateTransformAttributes,
    handleSvgDimensions,
    validateAttribute
} from './processing/attributes';
import {
    clearAssetsDir,
    ensureAssetsDir,
    getAssetsPath
} from './processing/fs';
import { convertAttributeCasing } from './utils';

type SvgOffset = {
    start: number;
    length: number;
};

export class ReactNativeSVG {
    svgMap: Record<string, { file: string; [key: string]: string }> = {};

    assetsPath: string;

    svgOffset: Record<string, SvgOffset> = {};

    constructor() {
        this.assetsPath = getAssetsPath();

        ensureAssetsDir(this.assetsPath);
        clearAssetsDir(this.assetsPath);
    }

    /**
     * Processes a JSXElement representing an SVG node and transforms it into
     * a web compliant SVG string with updated attributes and dimensions.
     * Stores the transformed SVG string and dimensions in `svgMap`, keyed by a UUID.
     *
     * @param name - Tag name of the JSXElement (e.g., 'svg', 'path').
     * @param path - Babel NodePath pointing to the JSXElement to process.
     * @param t - Babel types helper.
     * @returns Transformed SVG JSX string, or undefined if the tag is not supported.
     */
    processItem(
        name: string,
        path: Babel.NodePath<Babel.types.JSXElement>,
        t: typeof Babel.types
    ) {
        if (!svgSupportedNames.includes(name)) {
            return;
        }

        const clone = t.cloneNode(path.node, true);
        const dimensions: Record<string, string> = {};
        const id = uuidv4();

        this.transformElement(clone, dimensions, t);
        this.setNamespace(t, clone);

        const output = generate(clone).code;

        this.svgMap[id] = {
            file: output,
            ...dimensions
        };

        this.setNativeID(path.node, id);

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
     * Adds a `nativeID` attribute to the JSXElement using the provided UUID.
     * This helps in referencing or tracking the SVG element in native environments.
     *
     * @param el - JSXElement to which the `nativeID` should be added.
     * @param id - UUID string to assign as the `nativeID`.
     */
    private setNativeID(el: Babel.types.JSXElement, id: string) {
        el.openingElement.attributes.push(
            jsxAttribute(jSXIdentifier('nativeID'), stringLiteral(id))
        );
    }

    /**
     * Transforms an individual JSXElement by:
     * - Converting tag casing to be web-compatible.
     * - Processing and sanitizing attributes.
     * - Recursively handling children.
     *
     * @param el - JSXElement node to transform.
     * @param dimensions - Optional object to collect extracted width/height info.
     * @param t - Babel types helper.
     */
    private transformElement(
        el: Babel.types.JSXElement,
        dimensions: Record<string, string> = {},
        t: typeof Babel.types
    ) {
        const openingNode = el.openingElement.name;
        const isJSXIdentifierOpen = t.isJSXIdentifier(openingNode);

        // Fix casing for openingElement
        if (isJSXIdentifierOpen) {
            openingNode.name = convertAttributeCasing(openingNode.name);
        }

        const closingNode = el.closingElement?.name;
        const isJSXIdentifierClose = t.isJSXIdentifier(closingNode);

        // Fix casing for closingElement
        if (isJSXIdentifierClose) {
            closingNode.name = convertAttributeCasing(closingNode.name);
        }

        this.processAttributes(el, dimensions, t);
    }

    /**
     * Recursively traverses the children of a JSXElement and applies `transformElement`
     * to each child that is itself a JSXElement.
     *
     * @param t - Babel types helper.
     * @param jsxElement - Parent JSXElement whose children will be transformed.
     * @param dimensions - Optional object to propagate width/height info through child elements.
     */
    private traverseAndTransformChildren(
        t: typeof Babel.types,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {}
    ) {
        for (const child of jsxElement.children) {
            if (t.isJSXElement(child)) {
                this.transformElement(child, dimensions, t);
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
     * @param jsxElement - JSXElement whose attributes are to be processed.
     * @param dimensions - Optional object to collect extracted width/height info.
     * @param t - Babel types helper.
     */
    private processAttributes(
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {},
        t: typeof Babel.types
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
                    attr.name.name
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
                const dimensionsHandled = handleSvgDimensions(
                    t,
                    attr,
                    attrName,
                    dimensions,
                    name
                );

                if (dimensionsHandled) {
                    el.attributes.splice(index, 1);
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
                    el.attributes.splice(index, 1);
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
                const joinedTransformAttributesHandled = handleJoinedTranformAttributes(
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

        // Goes through an elemnts children and transforms its properties
        this.traverseAndTransformChildren(t, jsxElement, dimensions);
    }
}
