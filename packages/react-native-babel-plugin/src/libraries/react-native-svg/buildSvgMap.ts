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

import { exportNodeKey, nodeKey, splitNodeKey } from './nodeKeys';
import type { PathAliasResolver } from './pathAliasResolver';
import {
    isBareSpecifier,
    resolveModuleFileFromBase,
    resolveRelativeModuleFile
} from './pathAliasResolver';
import { getExportedName, getLocalName } from './specifierNames';
import type { SvgBindingMap } from './svgBindingMap';

/** Resolves an import/export source that already ends in `.svg`. Returns
 * `null` when `source` is a bare specifier (e.g. a typo'd or unconfigured
 * alias) that no alias mechanism could resolve -- treating it as relative
 * to the importing file's directory in that case would fabricate a path
 * that's guaranteed not to exist on disk. */
function resolveImportSource(
    pathAliasResolver: PathAliasResolver,
    file: string,
    source: string
): string | null {
    const aliasResolved = pathAliasResolver.resolve(source, file);
    if (aliasResolved) {
        return aliasResolved;
    }
    if (isBareSpecifier(source)) {
        return null;
    }
    return pathN.resolve(pathN.dirname(file), source);
}

/** Returns the resolved `.svg` file path for an import/export source, or
 * `null` if it isn't an SVG import. A source that already ends in `.svg`
 * is resolved directly; otherwise it may still be an aliased specifier
 * (e.g. `alias: { '@logo': './src/assets/logo.svg' }` used as `import Logo
 * from '@logo'`) whose specifier itself carries no extension, so alias
 * resolution is attempted before giving up. */
function resolveSvgImportSource(
    pathAliasResolver: PathAliasResolver,
    file: string,
    source: string
): string | null {
    if (source.endsWith('.svg')) {
        return resolveImportSource(pathAliasResolver, file, source);
    }

    const aliased = pathAliasResolver.resolve(source, file);
    return aliased?.endsWith('.svg') ? aliased : null;
}

/** Records a `bindingEdges` entry for each specifier of a relative
 * `import ... from './somewhere'` -- mapping the LOCAL name in `file` to
 * the EXPORT-table entry it's bound to in the target file (an import
 * always reaches into what its source module exports, never that
 * module's own local scope), so a JSX usage of the local name can be
 * traced through to whatever ultimately defines it (a bare/aliased SVG
 * import, another barrel file, etc). Namespace imports (`import * as X`)
 * aren't tracked: JSX would reference them via a member expression
 * (`<X.Foo/>`), which isn't a plain name this graph models. */
function recordRelativeImportEdges(
    t: typeof Babel.types,
    file: string,
    source: string,
    specifiers: Babel.types.ImportDeclaration['specifiers'],
    bindingEdges: Map<string, string>
): void {
    const targetFile = resolveRelativeModuleFile(file, source);
    if (!targetFile) {
        return;
    }

    for (const spec of specifiers) {
        const localName = getLocalName(t, spec.local);
        if (!localName) {
            continue;
        }

        let importedName: string | null = null;
        if (t.isImportDefaultSpecifier(spec)) {
            importedName = 'default';
        } else if (t.isImportSpecifier(spec)) {
            importedName = getNodeName(
                t,
                t.isStringLiteral(spec.imported)
                    ? spec.imported.value
                    : spec.imported.name
            );
        }

        if (!importedName) {
            continue;
        }

        bindingEdges.set(
            nodeKey(file, localName),
            exportNodeKey(targetFile, importedName)
        );
    }
}

/** Shared specifier-walking logic behind `recordRelativeReexportEdges` and
 * `recordLocalReexportEdges` below -- both record one `bindingEdges` entry
 * per `ExportSpecifier`, mapping `file`'s own EXPORT-table entry
 * (`exportNodeKey(file, exportedName)`) to a target key built from the
 * specifier's local name. Only how that target key is built differs
 * between the two callers (another file's own export-table entry vs. a
 * same-file local binding), so that's the one thing left as a
 * parameter. */
function recordExportSpecifierEdges(
    t: typeof Babel.types,
    file: string,
    specifiers: Babel.types.ExportNamedDeclaration['specifiers'],
    bindingEdges: Map<string, string>,
    targetKeyFor: (localName: string) => string
): void {
    for (const spec of specifiers) {
        if (spec.type !== 'ExportSpecifier') {
            continue;
        }

        const exportedName = getExportedName(t, spec.exported);
        const localName = getLocalName(t, spec.local);
        if (!exportedName || !localName) {
            continue;
        }

        bindingEdges.set(
            exportNodeKey(file, exportedName),
            targetKeyFor(localName)
        );
    }
}

/** Records a `bindingEdges` entry for each specifier of a relative
 * `export { ... } from './somewhere'` re-export -- mapping `file`'s own
 * EXPORT-table entry to the EXPORT-table entry it re-exports from the
 * target file (both ends are export-table entries: this declaration
 * doesn't reference or create any local binding in either file), the
 * mirror image of `recordRelativeImportEdges` above for barrel files. */
function recordRelativeReexportEdges(
    t: typeof Babel.types,
    file: string,
    source: string,
    specifiers: Babel.types.ExportNamedDeclaration['specifiers'],
    bindingEdges: Map<string, string>
): void {
    const targetFile = resolveRelativeModuleFile(file, source);
    if (!targetFile) {
        return;
    }

    recordExportSpecifierEdges(t, file, specifiers, bindingEdges, localName =>
        exportNodeKey(targetFile, localName)
    );
}

/** Records a same-file `bindingEdges` entry for each specifier of a local
 * re-export with no `from` source (e.g. `import Something from '@alias';
 * export { Something as LocalComponent };`) -- maps `file`'s own
 * EXPORT-table entry `LocalComponent` to its LOCAL binding `Something`
 * (this form, unlike the one above, really does reference an existing
 * local variable in the same file: there's no `from` module to reach
 * into). The within-file counterpart of `recordRelativeReexportEdges`
 * above, since this rebind never crosses a module boundary for
 * `resolveRelativeModuleFile` to resolve.
 *
 * Note: not a self-loop even when the exported name equals the local name
 * (e.g. `export { Logo };`, no rename) -- the source is `file`'s
 * EXPORT-table entry, the target is `file`'s LOCAL scope, two distinct
 * kinds of node that happen to share the same text, exactly the sort of
 * same-name-different-kind pair `exportNodeKey`/`nodeKey` exist to keep
 * apart. */
function recordLocalReexportEdges(
    t: typeof Babel.types,
    file: string,
    specifiers: Babel.types.ExportNamedDeclaration['specifiers'],
    bindingEdges: Map<string, string>
): void {
    recordExportSpecifierEdges(t, file, specifiers, bindingEdges, localName =>
        nodeKey(file, localName)
    );
}

export type ScanOptions = {
    t: typeof Babel.types;
    rootDir: string;
    scanIgnorePatterns: string[];
    followSymlinks: boolean;
    pathAliasResolver: PathAliasResolver;
    svgBindingMap: SvgBindingMap;
};

/**
 * Scans every source file under `rootDir` to detect `.svg` imports and
 * builds a mapping from JSX identifiers to their corresponding SVG file
 * paths, writing the result into `svgBindingMap`. Parses each file's AST
 * and collects `import`/`export` declarations that reference `.svg`
 * files, tracing re-export chains (relative, local, wildcard, and
 * bare/aliased) so a name rendered as JSX in one file can still resolve
 * to a bare/aliased SVG import declared in a completely different file.
 *
 * Files matching `scanIgnorePatterns` are skipped.
 */
export function scanProjectForSvgs({
    t,
    rootDir,
    scanIgnorePatterns,
    followSymlinks,
    pathAliasResolver,
    svgBindingMap
}: ScanOptions): void {
    const files = glob.sync('**/*.{js,jsx,ts,tsx}', {
        cwd: rootDir,
        absolute: true,
        ignore: scanIgnorePatterns,
        followSymbolicLinks: followSymlinks
    });

    // An extensionless aliased import (e.g. `@logo` -> a .svg with no
    // extension in the specifier) can only be told apart from an
    // ordinary bare import (e.g. 'react') by actually attempting alias
    // resolution, which is expensive per file (it can trigger
    // @babel/core's loadPartialConfig()). Running that for every bare
    // import in every file -- most of which are never SVGs -- would
    // regress badly on large codebases. So this defers alias resolution
    // for non-'.svg'-suffixed sources to a second pass, run only for
    // import/export names that are provably rendered as JSX somewhere
    // in the project (checked project-wide, not per file, since a
    // barrel re-export and its JSX usage can live in different files --
    // see the barrel-export tests). An import never rendered as JSX
    // could never be looked up via localSvgMap anyway.
    type PendingBareSource = {
        file: string;
        source: string;
        candidateNames: string[];
        // Whether `candidateNames` live in `file`'s local scope (a bare
        // `import`) or its export table (a bare re-export) -- decides
        // which of `nodeKey`/`exportNodeKey` the reachability check
        // below must test, since JSX usage of a re-exported name is
        // impossible (JSX can only ever reference a local binding).
        nameKind: 'local' | 'export';
        // Takes the subset of `candidateNames` actually proven
        // reachable (not all of them) -- a multi-specifier import/export
        // can have some names that are genuinely JSX-rendered and others
        // that are merely co-imported, and only the former should ever
        // be written to `localSvgMap`.
        populate: (
            resolved: string,
            reachableNames: ReadonlySet<string>
        ) => void;
    };
    const pendingBareSources: PendingBareSource[] = [];
    // How the two `pendingBareSources.push` call sites below differ is
    // entirely in how `candidateNames` gets collected (import vs.
    // export specifiers) and what `populate` does with a resolved
    // path -- both genuinely distinct per caller. This just centralizes
    // the "skip if nothing to defer, otherwise defer it" wrapper they'd
    // otherwise duplicate around that.
    const deferBareSource = (entry: PendingBareSource): void => {
        if (!entry.candidateNames.length) {
            return;
        }
        pendingBareSources.push(entry);
    };
    // JSX usages, kept per-file (not a flat name set) -- a name rendered
    // as JSX in one file must never be able to justify resolving an
    // unrelated bare import of the same name in a different file (e.g. a
    // real `<Button/>` from a UI library colliding with an aliased SVG
    // import also named `Button` elsewhere).
    const usedJsxNodes = new Set<string>();
    // Relative import/re-export bindings, so a name rendered as JSX can
    // still be traced through a barrel file to the bare/aliased source
    // that actually defines it, without falling back to matching on the
    // name alone project-wide.
    const bindingEdges = new Map<string, string>();
    // `export * from './x'` re-exports every named export of its target
    // under the SAME name (never renamed), so unlike a named re-export
    // we can't record a concrete per-name edge until we know which
    // names might actually matter project-wide -- resolved to concrete
    // pass-through edges once the scan below has collected that set.
    const wildcardReexports: Array<{
        file: string;
        targetFile: string;
    }> = [];
    // A direct `import X from './x.svg'` is always a real SVG, so
    // unlike the bare/aliased case above it never needs a reachability
    // check -- but the actual `setLocalSvgMapEntry` write is still
    // deferred until after `rootsReaching` (below) exists, so a file
    // that consumes this same import through a re-export chain gets
    // its own precise `localSvgMapByBinding` entry too, not just the
    // flat map.
    const pendingDirectSvgImports: Array<{
        file: string;
        name: string;
        resolved: string;
    }> = [];
    // Same deferral, for a direct `export { X } from './x.svg'`.
    const pendingDirectSvgExports: Array<{
        file: string;
        path: Babel.NodePath<Babel.types.ExportNamedDeclaration>;
        resolved: string;
    }> = [];

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
                JSXOpeningElement: path => {
                    const name = getNodeName(t, path.node.name);
                    if (name) {
                        usedJsxNodes.add(nodeKey(file, name));
                    }
                },
                ImportDeclaration: path => {
                    const source = path.node.source.value;

                    if (source.endsWith('.svg')) {
                        const resolved = resolveImportSource(
                            pathAliasResolver,
                            file,
                            source
                        );
                        if (resolved) {
                            for (const spec of path.node.specifiers) {
                                const name = getLocalName(t, spec.local);
                                if (name) {
                                    pendingDirectSvgImports.push({
                                        file,
                                        name,
                                        resolved
                                    });
                                }
                            }
                        }
                        return;
                    }

                    if (!isBareSpecifier(source)) {
                        recordRelativeImportEdges(
                            t,
                            file,
                            source,
                            path.node.specifiers,
                            bindingEdges
                        );
                        return;
                    }

                    const candidateNames: string[] = [];
                    for (const spec of path.node.specifiers) {
                        const name = getLocalName(t, spec.local);
                        if (name) {
                            candidateNames.push(name);
                        }
                    }
                    deferBareSource({
                        file,
                        source,
                        candidateNames,
                        nameKind: 'local',
                        populate: (resolved, reachableNames) => {
                            for (const name of candidateNames) {
                                if (reachableNames.has(name)) {
                                    svgBindingMap.setLocalSvgMapEntry(
                                        file,
                                        name,
                                        resolved,
                                        rootsReaching
                                    );
                                }
                            }
                        }
                    });
                },
                ExportAllDeclaration: path => {
                    // This parser config doesn't enable
                    // `exportNamespaceFrom`, so `export * as Name from
                    // './x'` (a single namespace binding, not a
                    // per-name pass-through) never reaches here as an
                    // `ExportAllDeclaration` -- every node visited by
                    // this handler is the plain `export * from './x'`
                    // form, which re-exports every name unchanged.
                    const source = path.node.source.value;
                    let targetFile: string | null;
                    if (isBareSpecifier(source)) {
                        // An alias can resolve as far as a bare
                        // directory (e.g. `'@icons'` -> `./icons`, with
                        // no specific file) -- still needs the same
                        // extension/index resolution a relative
                        // specifier gets, just starting from wherever
                        // the alias landed instead of `dirname(file)`.
                        const aliasResolved = pathAliasResolver.resolve(
                            source,
                            file
                        );
                        targetFile = aliasResolved
                            ? resolveModuleFileFromBase(aliasResolved)
                            : null;
                    } else {
                        targetFile = resolveRelativeModuleFile(file, source);
                    }
                    if (!targetFile) {
                        return;
                    }
                    wildcardReexports.push({ file, targetFile });
                },
                ExportDefaultDeclaration: path => {
                    const declaration = path.node.declaration;
                    // Only `export default SomeLocalName;` re-exports an
                    // existing binding under the name `'default'` -- a
                    // new declaration (`export default function() {}`)
                    // has no local binding for the graph to link to.
                    if (!t.isIdentifier(declaration)) {
                        return;
                    }
                    bindingEdges.set(
                        exportNodeKey(file, 'default'),
                        nodeKey(file, declaration.name)
                    );
                },
                ExportNamedDeclaration: path => {
                    const source = path.node.source?.value;
                    if (!source) {
                        recordLocalReexportEdges(
                            t,
                            file,
                            path.node.specifiers,
                            bindingEdges
                        );
                        return;
                    }

                    if (source.endsWith('.svg')) {
                        const resolved = resolveImportSource(
                            pathAliasResolver,
                            file,
                            source
                        );
                        if (resolved) {
                            pendingDirectSvgExports.push({
                                file,
                                path,
                                resolved
                            });
                        }
                        return;
                    }

                    if (!isBareSpecifier(source)) {
                        recordRelativeReexportEdges(
                            t,
                            file,
                            source,
                            path.node.specifiers,
                            bindingEdges
                        );
                        return;
                    }

                    const candidateNames: string[] = [];
                    for (const spec of path.node.specifiers) {
                        if (spec.type !== 'ExportSpecifier') {
                            continue;
                        }
                        const name = getExportedName(t, spec.exported);
                        if (name) {
                            candidateNames.push(name);
                        }
                    }
                    deferBareSource({
                        file,
                        source,
                        candidateNames,
                        nameKind: 'export',
                        populate: (resolved, reachableNames) =>
                            svgBindingMap.populateExportedSvgNames(
                                t,
                                file,
                                path,
                                resolved,
                                reachableNames,
                                rootsReaching
                            )
                    });
                }
            });
        } catch (err) {
            console.error(`[buildSvgMap]: \n File: ${file}\n`, err);
        }
    }

    // Group wildcard re-exports by their own file -- unlike the other
    // four re-export mechanisms (each a single deterministic edge), a
    // file can have more than one `export * from` statement, and each
    // re-exports whatever name is actually being looked for rather
    // than a fixed, precomputable set of names. Fanning these out
    // during the walk below (instead of pre-flattening them into
    // `bindingEdges`, which can only hold one target per key) means a
    // second wildcard's real target is never starved by a first
    // wildcard that merely happened to claim the same key first.
    const wildcardTargetsByFile = new Map<string, string[]>();
    for (const { file, targetFile } of wildcardReexports) {
        const targets = wildcardTargetsByFile.get(file);
        if (targets) {
            targets.push(targetFile);
        } else {
            wildcardTargetsByFile.set(file, [targetFile]);
        }
    }

    // Walk outward from every real JSX usage, through the relative
    // import/re-export edges recorded above (plus any wildcard barrels
    // a node's file re-exports from), to find every (file, name) a JSX
    // render could actually be bound to -- a barrel file may re-export
    // a bare/aliased source under a name only ever rendered in a
    // different file, so this has to follow the real binding chain
    // rather than matching on the name in isolation.
    //
    // Walked per-root (rather than one merged flood-fill from every
    // root at once) so `rootsReaching` can record exactly which JSX
    // usage(s) each visited node is reachable from. That's what lets
    // `setLocalSvgMapEntry`/`setFlatSvgMapEntry` (on `svgBindingMap`)
    // write a precise `localSvgMapByBinding` entry for every file that
    // legitimately consumes a resolved SVG through a chain -- not just
    // the file holding the original import/export declaration -- so a
    // same-named unrelated binding in some OTHER, unconnected file can
    // never inherit it via the flat map fallback. `.pop()` makes each
    // per-root traversal LIFO, which doesn't matter here since it's a
    // flood-fill into a visited set, not a shortest-path search. Most
    // JSX usages (a plain `<View>`, `<Text>`, ...) have no outgoing
    // `bindingEdges` entry at all, so their per-root walk is O(1);
    // only usages that actually trace through a chain do more work.
    const reachable = new Set<string>();
    const rootsReaching = new Map<string, Set<string>>();
    for (const root of usedJsxNodes) {
        const visited = new Set<string>();
        const queue: string[] = [root];
        while (queue.length) {
            const current = queue.pop();
            if (current === undefined || visited.has(current)) {
                continue;
            }
            visited.add(current);
            reachable.add(current);

            let consumers = rootsReaching.get(current);
            if (!consumers) {
                consumers = new Set();
                rootsReaching.set(current, consumers);
            }
            consumers.add(root);

            const directEdge = bindingEdges.get(current);
            if (directEdge) {
                queue.push(directEdge);
            }

            // A wildcard (`export * from './x'`) forwards from `file`'s
            // own EXPORT table into `targetFile`'s -- it never touches
            // local scope, so only fan out from an export-kind node
            // here. Most popped nodes are local-kind (every JSX-usage
            // root is), so check the kind byte directly and skip
            // splitting the key at all for those -- `splitNodeKey`
            // isn't needed unless this node could possibly have a
            // wildcard target.
            if (current[0] === 'E') {
                const [, currentFile, currentName] = splitNodeKey(current);
                const wildcardTargets = wildcardTargetsByFile.get(currentFile);
                if (wildcardTargets) {
                    for (const targetFile of wildcardTargets) {
                        queue.push(exportNodeKey(targetFile, currentName));
                    }
                }
            }
        }
    }

    // Only writable now that `rootsReaching` exists (see above) --
    // deferred from the first pass so a file that consumes one of
    // these direct, always-a-real-SVG imports/exports through a
    // re-export chain gets its own precise `localSvgMapByBinding`
    // entry too, not just the flat map.
    for (const entry of pendingDirectSvgImports) {
        try {
            svgBindingMap.setLocalSvgMapEntry(
                entry.file,
                entry.name,
                entry.resolved,
                rootsReaching
            );
        } catch (err) {
            console.error(`[buildSvgMap]: \n File: ${entry.file}\n`, err);
        }
    }
    for (const entry of pendingDirectSvgExports) {
        try {
            svgBindingMap.populateExportedSvgNames(
                t,
                entry.file,
                entry.path,
                entry.resolved,
                null,
                rootsReaching
            );
        } catch (err) {
            console.error(`[buildSvgMap]: \n File: ${entry.file}\n`, err);
        }
    }

    // Second pass: only now attempt the (potentially expensive) alias
    // resolution, and only for sources with at least one candidate name
    // that's actually reachable from a real JSX usage via that binding
    // chain (not just textually matching some unrelated usage elsewhere).
    // Wrapped in a try/catch per entry -- mirroring the first pass's
    // per-file isolation -- so a single misconfigured alias (e.g. a
    // malformed tsconfig.json `paths` pattern) can't abort SVG detection
    // for the rest of the project.
    for (const pending of pendingBareSources) {
        try {
            const keyFn =
                pending.nameKind === 'export' ? exportNodeKey : nodeKey;
            // Most bare imports/re-exports in a real project are never
            // rendered as JSX under any of their candidate names -- a
            // cheap, allocation-free `.some()` check lets that common
            // case skip straight past without paying for a `.filter()`
            // array and a `Set` that would just get discarded.
            if (
                !pending.candidateNames.some(name =>
                    reachable.has(keyFn(pending.file, name))
                )
            ) {
                continue;
            }
            const reachableNames = new Set(
                pending.candidateNames.filter(name =>
                    reachable.has(keyFn(pending.file, name))
                )
            );

            const resolved = resolveSvgImportSource(
                pathAliasResolver,
                pending.file,
                pending.source
            );
            if (!resolved) {
                continue;
            }

            pending.populate(resolved, reachableNames);
        } catch (err) {
            console.error(`[buildSvgMap]: \n File: ${pending.file}\n`, err);
        }
    }
}
