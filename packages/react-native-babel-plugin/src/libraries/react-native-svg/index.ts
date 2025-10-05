/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';
import glob from 'fast-glob';
import fs from 'fs';
import { default as pathN } from 'path';
import { optimize } from 'svgo';
import { v4 as uuidv4 } from 'uuid';

import { getNodeName } from '../../utils';

import { HandlerResolver } from './handlers/HandlerResolver';

type SvgOffset = {
    start: number;
    length: number;
};

export class ReactNativeSVG {
    svgMap: Record<string, { file: string; [key: string]: string }> = {};

    svgOffset: Record<string, SvgOffset> = {};

    localSvgMap: Record<string, { path: string; content?: string }> = {};

    constructor(
        private t: typeof Babel.types,
        private rootDir: string,
        private assetsPath: string
    ) {
        this.buildSvgMap();
    }

    /**
     * Scans all source files in the project to detect `.svg` imports and builds a mapping
     * of JSX identifiers to their corresponding SVG file paths. This is done by parsing each
     * file's AST and collecting `import` or `export` declarations that reference `.svg` files.
     *
     * The collected mappings are stored in `localSvgMap`, keyed by the local/imported variable
     * names (e.g., `Logo`, `IconSearch`), with their values pointing to the resolved file path.
     *
     * This method ignores files in `node_modules`, `lib`, and `dist`, as well as `.d.ts`, test,
     * and config files.
     */
    buildSvgMap() {
        // IMPROVEMENT: Support aliased paths
        const files = glob.sync(
            ['**/*.{js,jsx,ts,tsx}', '**/*.{js,jsx,ts,tsx}'],
            {
                cwd: this.rootDir,
                absolute: true,
                ignore: [
                    '**/node_modules/**',
                    '**/lib/**',
                    '**/dist/**',
                    '**/*.d.ts',
                    '**/*.test.*',
                    '**/*.config.js'
                ]
            }
        );

        for (const file of files) {
            try {
                const code = fs.readFileSync(file, 'utf8');
                if (!code) {
                    continue;
                }

                const ast = parser.parse(code, {
                    sourceType: 'module',
                    plugins: [
                        'jsx',
                        'typescript',
                        'exportDefaultFrom',
                        'classProperties',
                        'dynamicImport'
                    ]
                });

                traverse(ast, {
                    ImportDeclaration: path => {
                        const source = path.node.source.value;
                        if (!source.endsWith('.svg')) {
                            return;
                        }

                        const resolved = pathN.resolve(
                            pathN.dirname(file),
                            source
                        );
                        for (const spec of path.node.specifiers) {
                            const name = getNodeName(this.t, spec.local.name);
                            if (name) {
                                this.localSvgMap[name] = {
                                    path: resolved
                                };
                            }
                        }
                    },
                    ExportNamedDeclaration: path => {
                        const source = path.node.source?.value;
                        if (!source?.endsWith('.svg')) {
                            return;
                        }

                        const resolved = pathN.resolve(
                            pathN.dirname(file),
                            source
                        );
                        for (const spec of path.node.specifiers) {
                            if (spec.type === 'ExportSpecifier') {
                                const name = getNodeName(
                                    this.t,
                                    spec.local.name
                                );
                                if (name) {
                                    this.localSvgMap[name] = {
                                        path: resolved
                                    };
                                }
                            } else {
                                console.warn(
                                    `[buildSvgMap]: Unhandled export specifier type: ${spec.type}`
                                );
                            }
                        }
                    }
                });
            } catch (err) {
                console.error(`[buildSvgMap]: \n File: ${file}\n`, err);
            }
        }
    }

    /**
     * Processes a JSXElement representing an SVG-based component and transforms it into
     * a web-compliant SVG string with normalized attributes and extracted dimensions.
     * The resulting SVG content and its metadata (e.g., width/height) are stored in `svgMap`,
     * keyed by a generated UUID for later reference.
     *
     * Internally, the appropriate handler is selected based on the tag name and used to
     * perform the transformation.
     *
     * @param path - Babel NodePath pointing to the JSXElement to process.
     * @param name - JSX tag name (e.g., 'Svg', 'Logo') used to resolve the appropriate handler.
     * @returns An object containing the original SVG string and its optimized version,
     *          or `undefined` if no transformation could be performed.
     */
    processItem(path: Babel.NodePath<Babel.types.JSXElement>, name: string) {
        const dimensions: Record<string, string> = {};

        HandlerResolver.configure({
            t: this.t,
            path,
            name,
            localSvgMap: this.localSvgMap
        });

        const handler = HandlerResolver.create();
        const output = handler?.transformSvgNode(dimensions);

        if (!output) {
            return;
        }

        const id = uuidv4();
        const originalNode = path.node;

        this.svgMap[id] = {
            file: output,
            ...dimensions
        };

        this.setNativeID(originalNode, id);

        const optimized = optimize(output, {
            multipass: true,
            plugins: ['preset-default']
        });

        return { original: output, optimized };
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
}
