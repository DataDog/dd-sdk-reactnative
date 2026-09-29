/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as babelCore from '@babel/core';
import fs from 'fs';
import pathN from 'path';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import type { MatchPath } from 'tsconfig-paths';

// @babel/core's type declarations describe `options.plugins` as the input
// `PluginItem[]` shape, but `loadPartialConfig()` actually resolves each
// entry to a `ConfigItem` (undocumented in @types/babel__core) exposing
// `.file.resolved` and `.options`.
type ResolvedConfigItem = {
    file?: { resolved: string };
    options?: unknown;
    value?: unknown;
};

type ModuleResolverBinding = {
    resolvePath: (
        sourcePath: string,
        currentFile: string,
        opts: unknown
    ) => string | null;
    options: unknown;
};

type ModuleResolverModule = {
    default?: unknown;
    resolvePath?: ModuleResolverBinding['resolvePath'];
};

function isRelativePath(value: string): boolean {
    return /^\.?\.\//.test(value);
}

// Lives here (rather than as a private helper in index.ts, which also uses
// it) since `resolve()`'s own early-exit below needs the exact same
// relative/absolute check `isBareSpecifier` encodes -- keeping one copy
// means the two can't quietly drift apart. index.ts imports it from here
// instead of defining its own; that direction avoids a circular import,
// since index.ts already depends on this module.
export function isBareSpecifier(source: string): boolean {
    return source[0] !== '.' && !pathN.isAbsolute(source);
}

const RELATIVE_MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Metro resolves a platform-specific variant (e.g. `Icon.ios.tsx`) before
// the plain form, and some RN components only ever exist in platform-split
// files with no plain fallback -- tried without knowing which platform a
// real build would target, so all of them are candidates here.
const RELATIVE_MODULE_PLATFORM_SUFFIXES = ['ios', 'android', 'native', 'web'];

/** Resolves a `base` path (not yet known to be a real file -- it may be
 * missing its extension, or be a directory expecting an `index` file) to a
 * real file on disk, trying common extensions, platform-specific variants,
 * and index files -- mirrors enough of Node/Metro resolution to trace
 * re-export chains without pulling in a full resolver for what's normally a
 * single lookup. Used both for a relative specifier resolved to an absolute
 * `base` directly, and for an alias/tsconfig/Metro resolution that only
 * gets as far as a bare directory or extensionless path. */
export function resolveModuleFileFromBase(base: string): string | null {
    const withPlatformSuffixes = (prefix: string) =>
        RELATIVE_MODULE_PLATFORM_SUFFIXES.flatMap(platform =>
            RELATIVE_MODULE_EXTENSIONS.map(ext => `${prefix}.${platform}${ext}`)
        );
    const candidates = [
        base,
        ...withPlatformSuffixes(base),
        ...RELATIVE_MODULE_EXTENSIONS.map(ext => `${base}${ext}`),
        ...withPlatformSuffixes(pathN.join(base, 'index')),
        ...RELATIVE_MODULE_EXTENSIONS.map(ext =>
            pathN.join(base, `index${ext}`)
        )
    ];
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        } catch (err) {
            // Treat an unreadable candidate the same as a missing one.
        }
    }
    return null;
}

/** Resolves a relative import specifier (e.g. `./icons`) to a real file on
 * disk -- see `resolveModuleFileFromBase` for how. */
export function resolveRelativeModuleFile(
    fromFile: string,
    specifier: string
): string | null {
    return resolveModuleFileFromBase(
        pathN.resolve(pathN.dirname(fromFile), specifier)
    );
}

// Tried, in order, when a bare module-resolver alias target has no
// extension of its own -- `.svg` first, since resolving an aliased SVG
// import is this whole resolver's reason for existing.
const MODULE_SPECIFIER_FALLBACK_EXTENSIONS = [
    '.svg',
    '.ts',
    '.tsx',
    '.js',
    '.jsx'
];

/**
 * Walks upward from `startDir` (inclusive) to the filesystem root looking
 * for one of `fileNames`, mirroring how `tsconfig-paths` itself locates
 * `tsconfig.json`/`jsconfig.json`. `rootDir` is the CLI/plugin's *scan*
 * root (e.g. `--path ./src`), which is very often a subdirectory of the
 * actual project root where `metro.config.js` lives -- a single lookup
 * inside `rootDir` alone would miss it.
 *
 * `cache` is keyed by every directory visited on the way to the answer
 * (not just `startDir`), with path compression: once any directory's
 * answer is known -- a resolved config path, or `null` if none exists
 * anywhere above it -- every directory the walk passed through to reach
 * it is backfilled with that same answer. A project with many directories
 * that all share one project-root config then only ever pays for the walk
 * once, not once per directory that happens to need it.
 */
function findConfigUpward(
    startDir: string,
    fileNames: string[],
    cache: Map<string, string | null>
): string | null {
    const visited: string[] = [];
    let dir = startDir;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const cached = cache.get(dir);
        if (cached !== undefined) {
            for (const visitedDir of visited) {
                cache.set(visitedDir, cached);
            }
            return cached;
        }
        visited.push(dir);

        for (const name of fileNames) {
            const candidate = pathN.join(dir, name);
            if (fs.existsSync(candidate)) {
                for (const visitedDir of visited) {
                    cache.set(visitedDir, candidate);
                }
                return candidate;
            }
        }

        const parent = pathN.dirname(dir);
        if (parent === dir) {
            for (const visitedDir of visited) {
                cache.set(visitedDir, null);
            }
            return null;
        }
        dir = parent;
    }
}

/**
 * Splits a bare import specifier into the "package name" Metro's own
 * resolver (`metro-resolver`'s `parseBareSpecifier`) would use to look it up
 * in `resolver.extraNodeModules`, and the remaining subpath. Scoped-looking
 * specifiers (starting with `@`) only split after their *second* path
 * segment -- `@scope/pkg/sub` maps package name `@scope/pkg`, but `@scope/sub`
 * (only one slash) has no further segment to split on, so the whole
 * specifier is the package name, exactly mirroring Metro's own behavior.
 */
function parseExtraNodeModulesSpecifier(
    specifier: string
): {
    packageName: string;
    subpath: string;
} {
    const firstSlash = specifier.indexOf('/');
    if (specifier[0] === '@' && firstSlash !== -1) {
        const secondSlash = specifier.indexOf('/', firstSlash + 1);
        if (secondSlash === -1) {
            return { packageName: specifier, subpath: '' };
        }
        return {
            packageName: specifier.slice(0, secondSlash),
            subpath: specifier.slice(secondSlash)
        };
    }
    if (firstSlash === -1) {
        return { packageName: specifier, subpath: '' };
    }
    return {
        packageName: specifier.slice(0, firstSlash),
        subpath: specifier.slice(firstSlash)
    };
}

/**
 * Resolves non-relative import specifiers (e.g. `@components/Logo`) against a
 * project's `babel-plugin-module-resolver` config, its
 * `tsconfig.json`/`jsconfig.json` `paths` mapping, and/or its
 * `metro.config.js` `resolver.extraNodeModules` map, so aliased local SVG
 * imports can be found on disk the same way they resolve at runtime.
 *
 * Callers should still fall back to plain relative resolution when this
 * returns `null` -- that covers projects that don't use any aliasing.
 */
export class PathAliasResolver {
    private rootDir: string;

    private moduleResolverBindings = new Map<
        string,
        ModuleResolverBinding | null
    >();

    // Two-layer caches: the first layer (below) maps every directory a
    // lookup started from to the config file it resolves to (with the path
    // compression `findConfigUpward` performs) -- a monorepo can have
    // multiple tsconfig.json/metro.config.js files, so each directory needs
    // its own nearest config rather than sharing whichever one resolved
    // first for the whole instance. The second layer maps each resolved
    // config PATH to its parsed value, so directories that share one
    // config (by far the common case) only pay to load/parse it once.
    private tsconfigPathByDir = new Map<string, string | null>();

    private tsMatchPathByConfigPath = new Map<string, MatchPath | null>();

    private metroConfigPathByDir = new Map<string, string | null>();

    private metroExtraNodeModulesByConfigPath = new Map<
        string,
        Record<string, string> | null
    >();

    private resultCache = new Map<string, string | null>();

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    /** Drops all cached config/results -- call before reusing this resolver
     * for a fresh scan, since a stale cache would otherwise outlive edits to
     * tsconfig.json/Babel config made after it was first computed. */
    reset(): void {
        this.moduleResolverBindings.clear();
        this.tsconfigPathByDir.clear();
        this.tsMatchPathByConfigPath.clear();
        this.metroConfigPathByDir.clear();
        this.metroExtraNodeModulesByConfigPath.clear();
        this.resultCache.clear();
    }

    resolve(importSource: string, currentFile: string): string | null {
        if (!isBareSpecifier(importSource)) {
            return null;
        }

        const cacheKey = `${currentFile}\0${importSource}`;
        const cached = this.resultCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        const resolved =
            this.resolveWithModuleResolver(importSource, currentFile) ??
            this.resolveWithTsconfigPaths(importSource, currentFile) ??
            this.resolveWithMetroExtraNodeModules(importSource, currentFile);
        this.resultCache.set(cacheKey, resolved);
        return resolved;
    }

    private resolveWithModuleResolver(
        importSource: string,
        currentFile: string
    ): string | null {
        const binding = this.getModuleResolverBinding(currentFile);
        if (!binding) {
            return null;
        }

        try {
            // Delegate to the project's own installed babel-plugin-module-resolver
            // instead of re-implementing its alias/root matching -- this keeps
            // regex-keyed aliases, function-valued aliases, and glob roots working
            // exactly as they would at real build time.
            const resolved = binding.resolvePath(
                importSource,
                currentFile,
                binding.options
            );
            if (!resolved) {
                return null;
            }

            // An `alias` entry can map to an absolute path directly (e.g.
            // `alias: { '@app': path.resolve(__dirname, 'src') }`), not just a
            // path relative to the importing file -- return it as-is.
            if (pathN.isAbsolute(resolved)) {
                return resolved;
            }

            if (!isRelativePath(resolved)) {
                // `resolved` is a bare specifier (e.g. `alias: { '@ui':
                // 'my-ui-library' }`, the pattern babel-plugin-module-resolver's
                // own README documents) rather than a relative/absolute
                // path -- resolve it through Node's own module resolution
                // instead of discarding a legitimately-aliased target.
                const resolveOpts = {
                    paths: [pathN.dirname(currentFile), this.rootDir]
                };
                try {
                    return require.resolve(resolved, resolveOpts);
                } catch (packageResolveErr) {
                    // `require.resolve` only tries Node's own default
                    // extensions (.js/.json/.node) for an extensionless
                    // specifier -- an aliased target pointing at a
                    // bundler-resolved file like `.svg` (the case this
                    // whole resolver exists for) needs its extension
                    // guessed explicitly, the same way `resolveRelativeModuleFile`
                    // does for relative specifiers.
                    for (const ext of MODULE_SPECIFIER_FALLBACK_EXTENSIONS) {
                        try {
                            return require.resolve(
                                `${resolved}${ext}`,
                                resolveOpts
                            );
                        } catch (extResolveErr) {
                            // Try the next candidate extension.
                        }
                    }
                    return null;
                }
            }

            return pathN.resolve(pathN.dirname(currentFile), resolved);
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: babel-plugin-module-resolver failed to resolve an aliased import, falling back to relative resolution',
                err
            );
            return null;
        }
    }

    private resolveWithTsconfigPaths(
        importSource: string,
        currentFile: string
    ): string | null {
        const matchPath = this.getTsMatchPath(currentFile);
        if (!matchPath) {
            return null;
        }

        try {
            // `matchPath` can still throw at match time (not just when this
            // config was first loaded) -- e.g. a malformed/conflicting
            // `paths` pattern -- so guard it the same way
            // `resolveWithModuleResolver` guards its own third-party call.
            return matchPath(importSource) ?? null;
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: tsconfig-paths failed to resolve an aliased import, falling back to relative resolution',
                err
            );
            return null;
        }
    }

    private resolveWithMetroExtraNodeModules(
        importSource: string,
        currentFile: string
    ): string | null {
        const extraNodeModules = this.getMetroExtraNodeModules(currentFile);
        if (!extraNodeModules) {
            return null;
        }

        const { packageName, subpath } = parseExtraNodeModulesSpecifier(
            importSource
        );
        // A plain indexed lookup would also return inherited
        // `Object.prototype` members for a specifier like `constructor/foo`
        // (`extraNodeModules.constructor` is the `Object` function, not
        // `undefined`) -- guard against both that and a non-string config
        // value before treating it as a path.
        if (
            !Object.prototype.hasOwnProperty.call(extraNodeModules, packageName)
        ) {
            return null;
        }
        const target = extraNodeModules[packageName];
        if (typeof target !== 'string') {
            return null;
        }

        return subpath ? pathN.join(target, subpath) : target;
    }

    private getMetroExtraNodeModules(
        currentFile: string
    ): Record<string, string> | null {
        // Walk upward from the FILE's own directory, not `rootDir` -- a
        // monorepo scanned from one shared root can have multiple
        // metro.config.js files, each governing its own subpackage, and
        // caching a single instance-wide result would apply whichever one
        // resolved first to every file, regardless of which subpackage it's
        // actually in. `findConfigUpward`'s path compression means this
        // walk only runs once per distinct config discovered, not once per
        // directory -- the common single-project case (one config shared
        // by every directory) still resolves in O(1) after the first call.
        const dir = pathN.dirname(currentFile);
        const configPath = findConfigUpward(
            dir,
            ['metro.config.js', 'metro.config.cjs'],
            this.metroConfigPathByDir
        );
        if (!configPath) {
            return null;
        }

        const cached = this.metroExtraNodeModulesByConfigPath.get(configPath);
        if (cached !== undefined) {
            return cached;
        }

        let extraNodeModulesResult: Record<string, string> | null = null;
        try {
            // Unlike loadPartialConfig()/loadConfig() below (which read
            // their config files fresh from disk each call), require()
            // caches by resolved filename -- drop any cached entry first so
            // an edit to metro.config.js made since this was last required
            // is picked up after reset(), instead of silently reusing a
            // stale module.
            delete require.cache[require.resolve(configPath)];
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const config = require(configPath) as {
                resolver?: { extraNodeModules?: unknown };
            };
            const extraNodeModules = config?.resolver?.extraNodeModules;
            extraNodeModulesResult =
                extraNodeModules && typeof extraNodeModules === 'object'
                    ? (extraNodeModules as Record<string, string>)
                    : null;
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: Failed to load metro.config.js, aliased SVG imports may not resolve',
                err
            );
        }

        this.metroExtraNodeModulesByConfigPath.set(
            configPath,
            extraNodeModulesResult
        );
        return extraNodeModulesResult;
    }

    private getTsMatchPath(currentFile: string): MatchPath | null {
        // Same reasoning as `getMetroExtraNodeModules` above -- find (and
        // cache, with path compression) the nearest tsconfig.json/
        // jsconfig.json from the file's own directory, so each subpackage
        // in a monorepo gets its own config; but only load/parse each
        // distinct config path once, not once per directory that happens
        // to share it.
        const dir = pathN.dirname(currentFile);
        const configPath = findConfigUpward(
            dir,
            ['tsconfig.json', 'jsconfig.json'],
            this.tsconfigPathByDir
        );
        if (!configPath) {
            return null;
        }

        const cached = this.tsMatchPathByConfigPath.get(configPath);
        if (cached !== undefined) {
            return cached;
        }

        let matchPathResult: MatchPath | null = null;
        try {
            // Passing the config's own directory (rather than `dir`) means
            // `loadConfig` finds it on its first check instead of repeating
            // the upward walk `findConfigUpward` already just did.
            const config = loadConfig(pathN.dirname(configPath));
            if (config.resultType === 'success') {
                matchPathResult = createMatchPath(
                    config.absoluteBaseUrl,
                    config.paths
                );
            }
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: Failed to load tsconfig.json/jsconfig.json paths, aliased SVG imports may not resolve',
                err
            );
        }

        this.tsMatchPathByConfigPath.set(configPath, matchPathResult);
        return matchPathResult;
    }

    private getModuleResolverBinding(
        currentFile: string
    ): ModuleResolverBinding | null {
        if (this.moduleResolverBindings.has(currentFile)) {
            return this.moduleResolverBindings.get(currentFile) ?? null;
        }

        try {
            // `rootDir` is the CLI/plugin's *scan* root (e.g. `--path
            // ./src`), which is often a subdirectory of the real project
            // root where babel.config.js actually lives. Babel's default
            // rootMode ('root') only checks `cwd` itself; 'upward-optional'
            // walks up to find it instead, falling back to `cwd` (rather
            // than throwing) when no config file exists anywhere above it.
            const partialConfig = babelCore.loadPartialConfig({
                cwd: this.rootDir,
                filename: currentFile,
                rootMode: 'upward-optional'
            });

            const plugins = ((partialConfig?.options.plugins ??
                []) as unknown) as ResolvedConfigItem[];
            // Compare with normalized (forward-slash) separators -- `file.resolved`
            // uses the OS-native separator, which is a backslash on Windows.
            let pluginItem = plugins.find(plugin =>
                plugin.file?.resolved
                    .replace(/\\/g, '/')
                    .includes('/babel-plugin-module-resolver/')
            );

            let resolvedPluginPath = pluginItem?.file?.resolved;
            let moduleResolverModule: ModuleResolverModule | undefined;

            // Babel omits `file.resolved` when a config passes the plugin
            // function directly (for example `require('...')`). Resolve the
            // project-visible module and compare its exported function by
            // identity so this valid config form is detected too.
            if (!pluginItem) {
                const bindFunctionPlugin = (
                    modulePath: string,
                    candidateModule: ModuleResolverModule
                ): boolean => {
                    const candidatePluginItem = plugins.find(
                        plugin =>
                            plugin.value === candidateModule.default ||
                            plugin.value === candidateModule
                    );
                    if (!candidatePluginItem) {
                        return false;
                    }

                    resolvedPluginPath = modulePath;
                    moduleResolverModule = candidateModule;
                    pluginItem = candidatePluginItem;
                    return true;
                };

                try {
                    const projectModulePath = require.resolve(
                        'babel-plugin-module-resolver',
                        {
                            paths: [pathN.dirname(currentFile), this.rootDir]
                        }
                    );
                    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
                    const projectModule = require(projectModulePath) as ModuleResolverModule;
                    bindFunctionPlugin(projectModulePath, projectModule);
                } catch (err) {
                    // The config may have required an explicit module path
                    // outside rootDir, so check already-loaded modules below.
                }

                if (!pluginItem) {
                    for (const cachedModule of Object.values(require.cache)) {
                        const modulePath = cachedModule?.filename;
                        if (
                            !cachedModule ||
                            !modulePath
                                ?.replace(/\\/g, '/')
                                .includes('/babel-plugin-module-resolver/')
                        ) {
                            continue;
                        }

                        if (
                            bindFunctionPlugin(
                                modulePath,
                                cachedModule.exports as ModuleResolverModule
                            )
                        ) {
                            break;
                        }
                    }
                }
            }

            const options = pluginItem?.options;
            if (
                !pluginItem ||
                !resolvedPluginPath ||
                !options ||
                typeof options !== 'object'
            ) {
                this.moduleResolverBindings.set(currentFile, null);
                return null;
            }

            // Require the project's own installed copy (via its resolved path,
            // rather than a bundled copy of ours) so behavior matches whatever
            // version is actually driving the project's real bundling. The
            // path is only known at runtime, so a dynamic require is required.
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            moduleResolverModule ??= require(resolvedPluginPath) as ModuleResolverModule;

            // babel-plugin-module-resolver defaults `cwd` to `process.cwd()`
            // when unset, which at real build time is the project root -- but
            // isn't necessarily true for this out-of-band scan (e.g. tests,
            // or a CLI run from elsewhere), so pin it explicitly. Use the
            // directory `loadPartialConfig` actually resolved `root` to
            // (available whenever a config file was found, even via the
            // `upward-optional` walk above) rather than `this.rootDir` --
            // otherwise a relative alias value written naturally relative to
            // the discovered config's own directory would resolve against
            // the (possibly different, narrower) scan root instead.
            const configRoot = partialConfig?.options.root ?? this.rootDir;
            const optionsWithCwd =
                'cwd' in options ? options : { ...options, cwd: configRoot };

            const binding = moduleResolverModule.resolvePath
                ? {
                      resolvePath: moduleResolverModule.resolvePath,
                      options: optionsWithCwd
                  }
                : null;
            this.moduleResolverBindings.set(currentFile, binding);
            return binding;
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: Failed to load babel-plugin-module-resolver config, aliased SVG imports may not resolve',
                err
            );
            this.moduleResolverBindings.set(currentFile, null);
            return null;
        }
    }
}
