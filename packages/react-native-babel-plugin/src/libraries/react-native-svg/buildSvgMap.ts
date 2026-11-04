/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import glob from 'fast-glob';
import fs from 'fs';
import pathN from 'path';

import { getNodeName } from '../../utils';

import type { SvgBindingMap } from './svgBindingMap';

export type ScanOptions = {
    t: typeof Babel.types;
    rootDir: string;
    scanIgnorePatterns: string[];
    followSymlinks: boolean;
    svgBindingMap: SvgBindingMap;
};

export function scanProjectForSvgs({
    t,
    rootDir,
    scanIgnorePatterns,
    followSymlinks,
    svgBindingMap
}: ScanOptions): void {
    const files = glob.sync('**/*.{js,jsx,ts,tsx}', {
        cwd: rootDir,
        absolute: true,
        ignore: scanIgnorePatterns,
        followSymbolicLinks: followSymlinks
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
                    if (!t) {
                        return;
                    }
                    const source = path.node.source.value;
                    if (!source.endsWith('.svg')) {
                        return;
                    }

                    const resolved = pathN.resolve(pathN.dirname(file), source);
                    for (const spec of path.node.specifiers) {
                        const name = getNodeName(t, spec.local.name);
                        if (name) {
                            svgBindingMap.setLocalSvgMapEntry(
                                file,
                                name,
                                resolved
                            );
                        }
                    }
                },
                ExportNamedDeclaration: path => {
                    if (!t) {
                        return;
                    }
                    const source = path.node.source?.value;
                    if (!source?.endsWith('.svg')) {
                        return;
                    }

                    const resolved = pathN.resolve(pathN.dirname(file), source);
                    for (const spec of path.node.specifiers) {
                        if (spec.type === 'ExportSpecifier') {
                            // spec.exported is the name consumers import under
                            // ('default' would be wrong for `export { default as Logo }`)
                            const exported = spec.exported;
                            const name = getNodeName(
                                t,
                                t.isStringLiteral(exported)
                                    ? exported.value
                                    : exported.name
                            );
                            if (name) {
                                svgBindingMap.setFlatSvgMapEntry(
                                    name,
                                    resolved
                                );
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
