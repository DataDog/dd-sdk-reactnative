/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { jsxIdentifier, stringLiteral } from '@babel/types';
import { createHash } from 'crypto';
import glob from 'fast-glob';
import fs from 'fs';
import pathN from 'path';
import { optimize } from 'svgo';
import { v4 as uuidv4 } from 'uuid';

import { getNodeName } from '../../utils';

import { HandlerResolver } from './handlers/HandlerResolver';
import { PathAliasResolver } from './pathAliasResolver';
import { writeAssetToDisk } from './processing/fs';

// Used when the caller (e.g. the plugin's own pre() hook) doesn't have a more
// specific set of patterns to pass in -- the generate-sr-assets CLI passes its
// own (larger, user-configurable) ignore list instead of relying on this.
const DEFAULT_SCAN_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/lib/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/*.test.*',
    '**/*.config.js'
];

/**
 * Internal processor responsible for detecting, transforming, and wrapping
 * React Native SVG components for use with Session Replay.
 *
 * This class scans the project for `.svg` imports, builds a mapping between
 * JSX identifiers and SVG files, and transforms JSX SVG nodes into
 * optimized, web-compatible SVG markup. Each transformed element is then
 * wrapped in a `SessionReplayView.Privacy` component with metadata used by
 * the native Session Replay layer.
 */
export class ReactNativeSVG {
    localSvgMap: Record<string, { path: string; content?: string }> = {};

    t: typeof Babel.types | null = null;

    private pathAliasResolver: PathAliasResolver;

    constructor(
        private rootDir: string,
        private assetsPath: string,
        private saveSvgMapToDisk: boolean = false,
        private scanIgnorePatterns: string[] = DEFAULT_SCAN_IGNORE_PATTERNS,
        private followSymlinks: boolean = false
    ) {
        this.pathAliasResolver = new PathAliasResolver(rootDir);
    }

    setApiTypes(t: typeof Babel.types) {
        this.t = t;
    }

    /**
     * Scans all source files in the project to detect `.svg` imports and builds a mapping
     * of JSX identifiers to their corresponding SVG file paths. This is done by parsing each
     * file's AST and collecting `import` or `export` declarations that reference `.svg` files.
     *
     * The collected mappings are stored in `localSvgMap`, keyed by the local/imported variable
     * names (e.g., `Logo`, `IconSearch`), with their values pointing to the resolved file path.
     *
     * Files matching `scanIgnorePatterns` (defaulted in the constructor) are skipped.
     *
     * If `saveSvgMapToDisk` is false, it will first attempt to load the mapping from a previously
     * saved `svg-map.json` file for better performance. If the file doesn't exist or can't be read,
     * it falls back to scanning the codebase.
     *
     * If `saveSvgMapToDisk` is true, the mapping will be saved to a JSON file in the assets directory
     * after scanning.
     */
    buildSvgMap() {
        if (!this.t) {
            return;
        }

        // If not saving to disk, try to load from existing svg-map.json first
        if (!this.saveSvgMapToDisk) {
            // Resolve to package root: from lib/commonjs/libraries/react-native-svg -> package root
            const packageRoot = pathN.resolve(__dirname, '../../../..');
            const svgMapPath = pathN.join(packageRoot, 'svg-map.json');
            try {
                if (fs.existsSync(svgMapPath)) {
                    const mapContent = fs.readFileSync(svgMapPath, 'utf8');
                    this.localSvgMap = JSON.parse(mapContent);
                    return;
                }
            } catch (err) {
                console.warn(
                    '[buildSvgMap]: Failed to load SVG map from disk, falling back to codebase scan',
                    err
                );
            }
        }

        // Drop any alias config cached from a previous buildSvgMap() run --
        // otherwise edits to tsconfig.json/babel.config.js made since then
        // would be invisible to a reused instance.
        this.pathAliasResolver.reset();

        const files = glob.sync('**/*.{js,jsx,ts,tsx}', {
            cwd: this.rootDir,
            absolute: true,
            ignore: this.scanIgnorePatterns,
            followSymbolicLinks: this.followSymlinks
        });

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
                        if (!this.t) {
                            return;
                        }
                        const source = path.node.source.value;
                        if (!source.endsWith('.svg')) {
                            return;
                        }

                        const resolved = this.resolveImportSource(file, source);
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
                        if (!this.t) {
                            return;
                        }
                        const source = path.node.source?.value;
                        if (!source?.endsWith('.svg')) {
                            return;
                        }

                        const resolved = this.resolveImportSource(file, source);
                        for (const spec of path.node.specifiers) {
                            if (spec.type === 'ExportSpecifier') {
                                // spec.exported is the name consumers import under
                                // ('default' would be wrong for `export { default as Logo }`)
                                const exported = spec.exported;
                                const name = getNodeName(
                                    this.t,
                                    this.t.isStringLiteral(exported)
                                        ? exported.value
                                        : exported.name
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

        // Save the mapping to disk if requested
        if (this.saveSvgMapToDisk) {
            try {
                // Resolve to package root: from lib/commonjs/libraries/react-native-svg -> package root
                const packageRoot = pathN.resolve(__dirname, '../../../..');
                const svgMapPath = pathN.join(packageRoot, 'svg-map.json');
                fs.writeFileSync(
                    svgMapPath,
                    JSON.stringify(this.localSvgMap, null, 2),
                    'utf8'
                );
            } catch (err) {
                console.error(
                    '[buildSvgMap]: Failed to save SVG map to disk',
                    err
                );
            }
        }
    }

    private resolveImportSource(file: string, source: string): string {
        return (
            this.pathAliasResolver.resolve(source, file) ??
            pathN.resolve(pathN.dirname(file), source)
        );
    }

    /**
     * Processes a JSXElement representing an SVG-based component and transforms it into
     * a web-compliant SVG string with normalized attributes and extracted dimensions.
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
        if (!this.t) {
            return;
        }

        try {
            const dimensions: { width?: string; height?: string } = {};

            if (path.node?.extra?.__wrappedForSR) {
                return;
            }

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

            try {
                const optimized = output.startsWith('http')
                    ? output
                    : optimize(output, {
                          multipass: true,
                          plugins: ['preset-default']
                      }).data;

                const hash = createHash('md5')
                    .update(optimized, 'utf8')
                    .digest('hex');

                const wrapper = this.wrapElementForSessionReplay(
                    this.t,
                    path,
                    id,
                    hash,
                    dimensions
                );

                path.replaceWith(wrapper);

                path.node.extra = {
                    __wrappedForSR: true
                };

                writeAssetToDisk(this.assetsPath, id, hash, optimized);

                return { original: output, optimized };
            } catch (err) {
                console.warn(err);
                return { original: null, optimized: null };
            }
        } catch (svgoError) {
            console.warn(
                'ReactNativeSVG[processItem]: Skipping SVG with dynamic expressions (cannot be optimized)'
            );
            return;
        }
    }

    /**
     * Wraps a JSX element with a `SessionReplayView.Privacy` component
     * and injects metadata attributes used by Session Replay.
     *
     * The resulting element is transformed into:
     * ```tsx
     * <SessionReplayView.Privacy
     *   nativeID={id}
     *   collapsable={false}
     *   pointerEvents="box-none"
     *   attributes={{
     *     type: 'svg',
     *     hash,
     *     width,
     *     height
     *   }}
     * >
     *   {originalElement}
     * </SessionReplayView.Privacy>
     * ```
     *
     * This transformation ensures the element is identifiable on the native side
     * while preserving its layout and interaction behavior.
     *
     * @param t - Babel types helper used to build and manipulate AST nodes.
     * @param path - The current JSXElement node path being transformed.
     * @param id - The unique native identifier assigned to the element.
     * @param hash - A content hash used to reference the corresponding resource.
     * @param dimensions - Optional width and height metadata to include in the attributes.
     * @returns A new `JSXElement` AST node wrapped in `SessionReplayView.Privacy`.
     */
    private wrapElementForSessionReplay(
        t: typeof Babel.types,
        path: Babel.NodePath<Babel.types.JSXElement>,
        id: string,
        hash: string,
        dimensions: { width?: string; height?: string }
    ) {
        const el = path.node;
        const { width, height } = dimensions;

        el.extra = {
            __wrappedForSR: true
        };

        const props = [
            t.objectProperty(t.identifier('type'), t.stringLiteral('svg')),
            t.objectProperty(t.identifier('hash'), t.stringLiteral(hash))
        ];

        if (width) {
            props.push(
                t.objectProperty(t.identifier('width'), t.stringLiteral(width))
            );
        }

        if (height) {
            props.push(
                t.objectProperty(
                    t.identifier('height'),
                    t.stringLiteral(height)
                )
            );
        }

        const attributeProp = t.jsxAttribute(
            t.jsxIdentifier('attributes'),
            t.jsxExpressionContainer(t.objectExpression(props))
        );

        const attributesNode = [
            t.jsxAttribute(jsxIdentifier('nativeID'), stringLiteral(id)),
            // https://reactnative.dev/docs/view#collapsable
            t.jsxAttribute(
                t.jsxIdentifier('collapsable'),
                t.jsxExpressionContainer(t.booleanLiteral(false))
            ),
            // https://reactnative.dev/docs/view#pointerevents
            t.jsxAttribute(
                t.jsxIdentifier('pointerEvents'),
                t.stringLiteral('box-none')
            ),
            attributeProp
        ];

        const viewWrapper = t.jsxElement(
            t.jsxOpeningElement(
                t.jsxMemberExpression(
                    t.jsxIdentifier('SessionReplayView'),
                    t.jsxIdentifier('Privacy')
                ),
                attributesNode,
                false
            ),
            t.jsxClosingElement(
                t.jsxMemberExpression(
                    t.jsxIdentifier('SessionReplayView'),
                    t.jsxIdentifier('Privacy')
                )
            ),
            [el],
            false
        );

        this.ensureSessionReplayImport(t, path);
        return viewWrapper;
    }

    /**
     * Ensures that the `SessionReplayView` import from
     * `@datadog/mobile-react-native-session-replay` exists in the file.
     *
     * If the import is not already present, this method injects a new
     * `import { SessionReplayView } from '@datadog/mobile-react-native-session-replay'`
     * declaration at the top of the program.
     *
     * @param t - Babel types helper used to create and check AST nodes.
     * @param path - The current JSXElement node path from which to locate the program root.
     */
    private ensureSessionReplayImport(
        t: typeof Babel.types,
        path: Babel.NodePath<Babel.types.JSXElement>
    ) {
        const program = path.findParent(p =>
            p.isProgram()
        ) as Babel.NodePath<Babel.types.Program>;

        const alreadyImported = program.node.body.some(node => {
            return (
                t.isImportDeclaration(node) &&
                node.source.value ===
                    '@datadog/mobile-react-native-session-replay' &&
                node.specifiers.some(
                    spec =>
                        t.isImportSpecifier(spec) &&
                        getNodeName(t, spec.imported) === 'SessionReplayView'
                )
            );
        });

        if (!alreadyImported) {
            const importDecl = t.importDeclaration(
                [
                    t.importSpecifier(
                        t.identifier('SessionReplayView'),
                        t.identifier('SessionReplayView')
                    )
                ],
                t.stringLiteral('@datadog/mobile-react-native-session-replay')
            );
            program.unshiftContainer('body', importDecl);
        }
    }
}
