/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import fs from 'fs';

import { getNodeName } from '../../../utils';
import { handleSvgDimensions } from '../processing/attributes';

import type { SvgHandler } from './SvgHandler';

export class LocalSvgHandler implements SvgHandler {
    constructor(
        private types: typeof Babel.types,
        private path: Babel.NodePath<Babel.types.JSXElement>,
        private name: string,
        private localSvgMap: Record<string, { path: string; content?: string }>
    ) {
        // no-op
    }

    /**
     * Retrieves and returns the contents of a local SVG file corresponding to the JSXElement tag name.
     * If the file hasn't been read yet, it reads the SVG content from disk and caches it in `localSvgMap`.
     * Also extracts and stores width/height dimensions from the JSX attributes into the `dimensions` object.
     *
     * @param dimensions - Object to collect extracted width/height info.
     * @returns Raw SVG string content from the local file, or undefined if the tag is not found in `localSvgMap`.
     */
    transformSvgNode(dimensions: Record<string, string>) {
        if (!this.localSvgMap[this.name]) {
            return undefined;
        }

        const { path, content } = this.localSvgMap[this.name];

        if (!content) {
            this.localSvgMap[this.name].content = fs.readFileSync(path, 'utf8');
        }

        this.processAttributes(this.types, this.path.node, dimensions);

        return this.localSvgMap[this.name].content;
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
        }
    }
}
