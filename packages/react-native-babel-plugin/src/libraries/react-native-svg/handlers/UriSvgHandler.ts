/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { getNodeName } from '../../../utils';
import { handleSvgDimensions } from '../processing/attributes';

import type { SvgHandler } from './SvgHandler';

/**
 * Handles extraction and transformation of SVG data from JSX elements that reference SVGs by URI.
 *
 * The `UriSvgHandler` inspects a JSXElement, extracts its `uri` attribute to locate the SVG source,
 * and captures its dimensional attributes (e.g., `width`, `height`) for further processing.
 *
 */
export class UriSvgHandler implements SvgHandler {
    constructor(
        private types: typeof Babel.types,
        private path: Babel.NodePath<Babel.types.JSXElement>,
        private name: string
    ) {
        // no-op
    }

    /**
     * Retrieves and returns the URI of an SVG corresponding.
     * Also extracts and stores width/height dimensions from the JSX attributes into the `dimensions` object.
     *
     * @param dimensions - Object to collect extracted width/height info.
     * @returns Raw SVG string content from the local file, or undefined if the tag is not found in `localSvgMap`.
     */
    transformSvgNode(dimensions: Record<string, string>) {
        const uri = this.processAttributes(
            this.types,
            this.path,
            this.path.node,
            dimensions
        );

        return uri;
    }

    /**
     * Processes the attributes of a JSXElement to extract relevant SVG metadata.
     * Specifically identifies and handles dimension-related attributes (e.g., width, height),
     * storing them into the provided `dimensions` object. Ignores spread attributes.
     *
     * @param t - Babel types helper.
     * @param rootElementPath - The path of the root JSX element containing the SVG.
     *   Used to locate lexical scopes (component or program) for resolving variable references.
     *   May be `null` if no traversal context is available.
     * @param jsxElement - The JSXElement whose attributes will be processed.
     * @param dimensions - Object to collect extracted width/height info.
     */
    private processAttributes(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string>
    ) {
        const el = jsxElement.openingElement;

        let uri: string | undefined;

        for (const attr of el.attributes) {
            if (t.isJSXSpreadAttribute(attr)) {
                continue;
            }

            const attrName = getNodeName(t, attr);
            if (!attrName) {
                continue;
            }

            // Handle SVG dimensions
            handleSvgDimensions(
                t,
                rootElementPath,
                attr,
                attrName,
                dimensions,
                this.name,
                this.name
            );

            if (attrName === 'uri') {
                if (t.isStringLiteral(attr.value)) {
                    uri = attr.value.value;
                }
            }
        }

        return uri;
    }
}
