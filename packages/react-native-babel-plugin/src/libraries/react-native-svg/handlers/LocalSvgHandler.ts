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
 * Inlines locally imported SVG components into JSX output during Babel
 * transformation.
 */
export class LocalSvgHandler implements SvgHandler {
    constructor(
        private types: typeof Babel.types,
        private path: Babel.NodePath<Babel.types.JSXElement>,
        private name: string,
        private svgPath: string,
        private readSvgContent: (path: string) => string
    ) {
        // no-op
    }

    transformSvgNode(dimensions: Record<string, string>) {
        if (!this.svgPath) {
            return undefined;
        }

        const content = this.readSvgContent(this.svgPath);

        if (!content) {
            return undefined;
        }

        this.processAttributes(
            this.types,
            this.path,
            this.path.node,
            dimensions
        );

        return content;
    }

    private processAttributes(
        t: typeof Babel.types,
        rootElementPath: Babel.NodePath<Babel.types.JSXElement> | null,
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

            handleSvgDimensions(
                t,
                rootElementPath,
                attr,
                attrName,
                dimensions,
                this.name,
                this.name
            );
        }
    }
}
