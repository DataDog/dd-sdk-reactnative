/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import pathN from 'path';
import { createMatchPath, loadConfig } from 'tsconfig-paths';
import type { MatchPath } from 'tsconfig-paths';

export function isBareSpecifier(source: string): boolean {
    return source[0] !== '.' && !pathN.isAbsolute(source);
}

// Cache every visited directory so neighboring files share each upward search.
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

export class PathAliasResolver {
    private tsconfigPathByDir = new Map<string, string | null>();

    private tsMatchPathByConfigPath = new Map<string, MatchPath | null>();

    private resultCache = new Map<string, string | null>();

    reset(): void {
        this.tsconfigPathByDir.clear();
        this.tsMatchPathByConfigPath.clear();
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

        const resolved = this.resolveWithTsconfigPaths(
            importSource,
            currentFile
        );
        this.resultCache.set(cacheKey, resolved);
        return resolved;
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
            return (
                matchPath(importSource, undefined, undefined, ['.svg']) ?? null
            );
        } catch (err) {
            console.warn(
                '[PathAliasResolver]: tsconfig-paths failed to resolve an aliased import, falling back to relative resolution',
                err
            );
            return null;
        }
    }

    private getTsMatchPath(currentFile: string): MatchPath | null {
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
}
