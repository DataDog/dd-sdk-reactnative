/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import generate from '@babel/generator';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';

import { getNodeName } from '../../../utils';
import { svgSupportedNames, xmlNamespace } from '../constants';
import {
    buildTransformStringAttribute,
    handleArrayAttributes,
    handleJoinedTransformAttributes,
    handleRegularAttributes,
    handleRNSpecificAttributes,
    handleSeparateTransformAttributes,
    handleSvgDimensions,
    isSupportedSvgElement,
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

        if (!this.isElementSupported(this.types, clone)) {
            return undefined;
        }

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
     * Pure check, run before any mutation — callers never infer support from whether a
     * transform happened to succeed. Only the element's own tag is checked here: unresolvable
     * property *values* are handled separately (see `processAttributes`) and don't affect
     * whether the element itself is kept.
     */
    private isElementSupported(
        t: typeof Babel.types,
        el: Babel.types.JSXElement
    ): boolean {
        const openingNode = el.openingElement.name;

        // A member expression (<Foo.Bar />), namespaced name, or any other non-identifier tag
        // name form is never in svgElements (a plain-string allowlist), so it's unsupported —
        // but it would otherwise skip this check entirely and pass through unconverted,
        // reopening the exact "one bad tag corrupts the whole SVG" failure this check exists
        // to prevent.
        if (!t.isJSXIdentifier(openingNode)) {
            console.warn(
                `RNSvgHandler[isElementSupported]: Removing element with an unsupported tag name form: "${getNodeName(
                    t,
                    openingNode
                )}"`
            );
            return false;
        }

        const elementName = convertAttributeCasing(openingNode.name);

        if (!isSupportedSvgElement(elementName)) {
            console.warn(
                `RNSvgHandler[isElementSupported]: Removing unsupported element: "${elementName}"`
            );
            return false;
        }

        if (el.closingElement) {
            const closingNode = el.closingElement.name;

            // Same treatment as the opening tag: return false (element removed by the caller)
            // rather than throw. A throw here wouldn't clean up the malformed node first, and
            // the mismatched tag left behind can make Babel's own code generation fail later —
            // for the *whole file*, not just this element. Removing it keeps the tree valid.
            if (!t.isJSXIdentifier(closingNode)) {
                console.warn(
                    `RNSvgHandler[isElementSupported]: Removing element with an unsupported closing tag name form: "${getNodeName(
                        t,
                        closingNode
                    )}"`
                );
                return false;
            }

            const closingElementName = convertAttributeCasing(closingNode.name);

            // `elementName` (the opening tag) is already confirmed supported above, so a
            // mismatch check here also subsumes "closing tag is unsupported": the only way
            // closingElementName can equal elementName is if it's supported too. Both tags can
            // individually be supported elements yet still not match each other (e.g.
            // <Circle>...</Rect>) — a real parser never produces this, but a malformed AST from
            // AST manipulation upstream could. Left unchecked, this would generate invalid
            // markup with the same whole-file blast radius as the other checks above.
            if (closingElementName !== elementName) {
                console.warn(
                    `RNSvgHandler[isElementSupported]: Removing element with mismatched closing tag: "${elementName}" vs "${closingElementName}"`
                );
                return false;
            }
        }

        return true;
    }

    /**
     * Assumes `isElementSupported(el)` already returned `true`.
     */
    private transformElement(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        el: Babel.types.JSXElement,
        dimensions: Record<string, string>
    ): void {
        const openingNode = el.openingElement.name;

        if (t.isJSXIdentifier(openingNode)) {
            openingNode.name = convertAttributeCasing(openingNode.name);
        }

        const closingNode = el.closingElement?.name;

        if (t.isJSXIdentifier(closingNode)) {
            closingNode.name = convertAttributeCasing(closingNode.name);
        }

        this.processAttributes(t, rootElementPath, el, dimensions);
    }

    private traverseAndTransformChildren(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {}
    ) {
        const children = jsxElement.children;

        // Iterate in reverse so splicing doesn't shift the indices of unvisited entries.
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (!t.isJSXElement(child)) {
                continue;
            }

            if (!this.isElementSupported(t, child)) {
                children.splice(i, 1);
                continue;
            }

            this.transformElement(t, rootElementPath, child, dimensions);
        }
    }

    private processAttributes(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {}
    ): void {
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

                const { attrName, isInvalidAttribute } = validateAttribute(
                    attr.name.name
                );

                if (isInvalidAttribute) {
                    el.attributes.splice(index, 1);
                    continue;
                }

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
                    // Unresolved variable dimensions are filled in natively, where wireframe
                    // sizing is available.
                    if (removeDimension) {
                        el.attributes.splice(index, 1);
                    }
                    continue;
                }

                attr.name.name = attrName;

                const arrayAttributesHandled = handleArrayAttributes(
                    t,
                    attr,
                    attrName
                );

                if (arrayAttributesHandled) {
                    continue;
                }

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

        buildTransformStringAttribute(el, transformsArray);
        this.traverseAndTransformChildren(t, null, jsxElement, dimensions);
    }
}
