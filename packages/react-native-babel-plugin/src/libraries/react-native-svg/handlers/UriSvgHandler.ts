/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { getNodeName } from '../../../utils';
import { handleSvgDimensions } from '../processing/attributes';

import type { SvgHandler } from './SvgHandler';

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
     * @param jsxElement - The JSXElement whose attributes will be processed.
     * @param dimensions - Object to collect extracted width/height info.
     */
    private processAttributes(
        t: typeof Babel.types,
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
                console.log('attr: ', JSON.stringify(attr, null, 2));
            }
        }

        return uri;
    }
}
