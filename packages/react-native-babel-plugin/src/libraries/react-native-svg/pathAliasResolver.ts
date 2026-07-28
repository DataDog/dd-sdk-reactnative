/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as babelCore from '@babel/core';
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

/**
 * Resolves non-relative import specifiers (e.g. `@components/Logo`) against a
 * project's `babel-plugin-module-resolver` config and/or its
 * `tsconfig.json`/`jsconfig.json` `paths` mapping, so aliased local SVG
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

    private tsMatchPath: MatchPath | null | undefined;

    private resultCache = new Map<string, string | null>();

    constructor(rootDir: string) {
        this.rootDir = rootDir;
    }

    /** Drops all cached config/results -- call before reusing this resolver
     * for a fresh scan, since a stale cache would otherwise outlive edits to
     * tsconfig.json/Babel config made after it was first computed. */
    reset(): void {
        this.moduleResolverBindings.clear();
        this.tsMatchPath = undefined;
        this.resultCache.clear();
    }

    resolve(importSource: string, currentFile: string): string | null {
        if (importSource[0] === '.' || pathN.isAbsolute(importSource)) {
            return null;
        }

        const cacheKey = `${currentFile}\0${importSource}`;
        const cached = this.resultCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        const resolved =
            this.resolveWithModuleResolver(importSource, currentFile) ??
            this.resolveWithTsconfigPaths(importSource);
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
            if (!resolved || !isRelativePath(resolved)) {
                return null;
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

    private resolveWithTsconfigPaths(importSource: string): string | null {
        const matchPath = this.getTsMatchPath();
        if (!matchPath) {
            return null;
        }

        return matchPath(importSource) ?? null;
    }

    private getTsMatchPath(): MatchPath | null {
        if (this.tsMatchPath !== undefined) {
            return this.tsMatchPath;
        }

        try {
            const config = loadConfig(this.rootDir);
            if (config.resultType === 'success') {
                this.tsMatchPath = createMatchPath(
                    config.absoluteBaseUrl,
                    config.paths
                );
            } else {
                this.tsMatchPath = null;
            }
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: Failed to load tsconfig.json/jsconfig.json paths, aliased SVG imports may not resolve',
                err
            );
            this.tsMatchPath = null;
        }

        return this.tsMatchPath;
    }

    private getModuleResolverBinding(
        currentFile: string
    ): ModuleResolverBinding | null {
        if (this.moduleResolverBindings.has(currentFile)) {
            return this.moduleResolverBindings.get(currentFile) ?? null;
        }

        try {
            const partialConfig = babelCore.loadPartialConfig({
                cwd: this.rootDir,
                filename: currentFile
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
            // or a CLI run from elsewhere), so pin it to rootDir explicitly.
            const optionsWithCwd =
                'cwd' in options ? options : { ...options, cwd: this.rootDir };

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
