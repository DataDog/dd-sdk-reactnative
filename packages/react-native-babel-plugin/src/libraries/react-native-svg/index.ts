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
import { writeAssetToDisk } from './processing/fs';

type SvgOffset = {
    start: number;
    length: number;
};

// A raw re-export edge found while scanning a file: `svgPath` is terminal
// (points at an .svg); `fromFile`/`fromName` is a barrel hop still to resolve.
type SvgExportEdge =
    | { svgPath: string }
    | { fromFile: string; fromName: string };

export class ReactNativeSVG {
    svgMap: Record<string, { file: string; [key: string]: string }> = {};

    svgOffset: Record<string, SvgOffset> = {};

    // Resolved SVG re-exports, keyed by the barrel file's absolute path, then
    // by the name it exposes. Direct `.svg` imports are resolved live in
    // resolveSvgImport and are not stored here.
    svgFileMap: Record<string, Record<string, string>> = {};

    private svgContentCache: Record<string, string> = {};

    t: typeof Babel.types | null = null;

    constructor(
        private rootDir: string,
        private assetsPath: string,
        private saveSvgMapToDisk: boolean = false
    ) {}

    setApiTypes(t: typeof Babel.types) {
        this.t = t;
    }

    /**
     * Scans the project for `.svg` barrel re-exports and populates svgFileMap,
     * following `export ... from` chains down to their terminal `.svg` file.
     */
    buildSvgMap() {
        if (!this.t) {
            return;
        }

        if (!this.saveSvgMapToDisk) {
            const packageRoot = resolvePackageRoot(__dirname);
            const svgMapPath = pathN.join(packageRoot, 'svg-map.json');
            try {
                if (fs.existsSync(svgMapPath)) {
                    const mapContent = fs.readFileSync(svgMapPath, 'utf8');
                    this.svgFileMap = JSON.parse(mapContent);
                    return;
                }
            } catch (err) {
                console.warn(
                    '[buildSvgMap]: Failed to load SVG map from disk, falling back to codebase scan',
                    err
                );
            }
        }

        // TODO: Support aliased paths (RUM-12185)
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

        const rawEdges: Record<string, Record<string, SvgExportEdge>> = {};

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
                    ExportNamedDeclaration: path => {
                        if (!this.t) {
                            return;
                        }
                        const source = path.node.source?.value;
                        if (!source) {
                            return;
                        }

                        const resolvedSourceFile = source.endsWith('.svg')
                            ? pathN.resolve(pathN.dirname(file), source)
                            : this.resolveModuleFile(
                                  pathN.dirname(file),
                                  source
                              );

                        if (!resolvedSourceFile) {
                            return;
                        }

                        for (const spec of path.node.specifiers) {
                            if (spec.type !== 'ExportSpecifier') {
                                console.warn(
                                    `[buildSvgMap]: Unhandled export specifier type: ${spec.type}`
                                );
                                continue;
                            }

                            // spec.exported is the name consumers import under
                            // ('default' would be wrong for aliased re-exports)
                            const exported = spec.exported;
                            const exportedName = getNodeName(
                                this.t,
                                this.t.isStringLiteral(exported)
                                    ? exported.value
                                    : exported.name
                            );
                            const localName = getNodeName(
                                this.t,
                                spec.local.name
                            );

                            if (!exportedName || !localName) {
                                continue;
                            }

                            rawEdges[file] ??= {};
                            rawEdges[file][exportedName] = source.endsWith(
                                '.svg'
                            )
                                ? { svgPath: resolvedSourceFile }
                                : {
                                      fromFile: resolvedSourceFile,
                                      fromName: localName
                                  };
                        }
                    }
                });
            } catch (err) {
                console.error(`[buildSvgMap]: \n File: ${file}\n`, err);
            }
        }

        const resolveEdge = (
            file: string,
            name: string,
            seen: Set<string> = new Set()
        ): string | null => {
            const key = `${file}#${name}`;
            if (seen.has(key)) {
                return null;
            }
            seen.add(key);

            const edge = rawEdges[file]?.[name];
            if (!edge) {
                return null;
            }
            if ('svgPath' in edge) {
                return edge.svgPath;
            }
            return resolveEdge(edge.fromFile, edge.fromName, seen);
        };

        for (const file of Object.keys(rawEdges)) {
            for (const name of Object.keys(rawEdges[file])) {
                const svgPath = resolveEdge(file, name);
                if (svgPath) {
                    this.svgFileMap[file] ??= {};
                    this.svgFileMap[file][name] = svgPath;
                }
            }
        }

        if (this.saveSvgMapToDisk) {
            try {
                const packageRoot = resolvePackageRoot(__dirname);
                const svgMapPath = pathN.join(packageRoot, 'svg-map.json');
                fs.writeFileSync(
                    svgMapPath,
                    JSON.stringify(this.svgFileMap, null, 2),
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

    private resolveModuleFile(fromDir: string, source: string): string | null {
        const base = pathN.resolve(fromDir, source);
        const candidates = [
            base,
            `${base}.ts`,
            `${base}.tsx`,
            `${base}.js`,
            `${base}.jsx`,
            pathN.join(base, 'index.ts'),
            pathN.join(base, 'index.tsx'),
            pathN.join(base, 'index.js'),
            pathN.join(base, 'index.jsx')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        }

        return null;
    }

    /**
     * Resolves the `.svg` path (if any) a JSX tag actually refers to in the
     * current file, via its real import binding rather than a name-only
     * lookup — this is what prevents cross-file name collisions.
     */
    resolveSvgImport(
        path: Babel.NodePath<Babel.types.JSXElement>,
        name: string,
        currentFile: string
    ): string | null {
        if (!this.t) {
            return null;
        }

        const binding = path.scope.getBinding(name);
        if (!binding) {
            return null;
        }

        const bindingNode = binding.path.node;
        const isDefaultSpecifier = this.t.isImportDefaultSpecifier(bindingNode);
        const isNamedSpecifier = this.t.isImportSpecifier(bindingNode);
        const isNamespaceSpecifier = this.t.isImportNamespaceSpecifier(
            bindingNode
        );

        if (!isDefaultSpecifier && !isNamedSpecifier && !isNamespaceSpecifier) {
            return null;
        }

        const importDeclaration = binding.path.parentPath?.node;
        if (
            !importDeclaration ||
            !this.t.isImportDeclaration(importDeclaration)
        ) {
            return null;
        }

        const source = importDeclaration.source.value;

        if (source.endsWith('.svg')) {
            return pathN.resolve(pathN.dirname(currentFile), source);
        }

        // A namespace import of a barrel (`import * as Icons from './icons'`)
        // doesn't map to a single re-exported name.
        if (isNamespaceSpecifier) {
            return null;
        }

        let importedName: string | null = null;
        if (isDefaultSpecifier) {
            importedName = 'default';
        } else if (this.t.isImportSpecifier(bindingNode)) {
            const imported = bindingNode.imported;
            importedName = this.t.isStringLiteral(imported)
                ? imported.value
                : imported.name;
        }

        if (!importedName) {
            return null;
        }

        const resolvedSourceFile = this.resolveModuleFile(
            pathN.dirname(currentFile),
            source
        );
        if (!resolvedSourceFile) {
            return null;
        }

        return this.svgFileMap[resolvedSourceFile]?.[importedName] ?? null;
    }

    getSvgContent(svgPath: string): string {
        if (!this.svgContentCache[svgPath]) {
            this.svgContentCache[svgPath] = fs.readFileSync(svgPath, 'utf8');
        }
        return this.svgContentCache[svgPath];
    }

    /**
     * Transforms a JSXElement representing an SVG-based component into
     * optimized, web-compatible SVG markup, wrapped for Session Replay.
     */
    processItem(
        path: Babel.NodePath<Babel.types.JSXElement>,
        name: string,
        currentFile: string
    ) {
        if (!this.t) {
            return;
        }

        try {
            const dimensions: { width?: string; height?: string } = {};

            if (path.node?.extra?.__wrappedForSR) {
                return;
            }

            const svgPath = this.resolveSvgImport(path, name, currentFile);

            HandlerResolver.configure({
                t: this.t,
                path,
                name,
                svgPath,
                readSvgContent: this.getSvgContent.bind(this)
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

                this.svgMap[id] = {
                    file: optimized,
                    ...dimensions
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
            t.jsxAttribute(
                t.jsxIdentifier('collapsable'),
                t.jsxExpressionContainer(t.booleanLiteral(false))
            ),
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

const PACKAGE_NAME = '@datadog/mobile-react-native-babel-plugin';

// __dirname's depth relative to the package root differs between the built
// lib/commonjs/... output and running straight from src/... (e.g. ts-jest),
// so a hardcoded relative offset would be wrong in one of the two. Walk up
// to the actual package.json instead.
function resolvePackageRoot(startDir: string): string {
    let currentDir = startDir;

    for (let i = 0; i < 10; i++) {
        const packageJsonPath = pathN.join(currentDir, 'package.json');
        try {
            if (fs.existsSync(packageJsonPath)) {
                const pkg = JSON.parse(
                    fs.readFileSync(packageJsonPath, 'utf8')
                );
                if (pkg.name === PACKAGE_NAME) {
                    return currentDir;
                }
            }
        } catch {
            // Malformed package.json — keep walking up.
        }

        const parentDir = pathN.dirname(currentDir);
        if (parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return pathN.resolve(startDir, '../../../..');
}
