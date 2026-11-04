/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';

import { nodeKey } from './nodeKeys';

export type SvgEntry = { path: string; content?: string };

const CURRENT_SVG_MAP_VERSION = 2;

function isObjectMap(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Stores legacy name lookups, precise file bindings, and their disk cache. */
export class SvgBindingMap {
    // A null prototype keeps imported names such as __proto__ as ordinary keys.
    localSvgMap: Record<string, SvgEntry> = Object.create(null);

    private localSvgMapByBinding: Record<string, SvgEntry> = {};

    // Preserve name-only re-export lookup alongside precise direct imports.
    private allowFlatFallback = true;

    reset(): void {
        this.localSvgMap = Object.create(null);
        this.localSvgMapByBinding = {};
        this.allowFlatFallback = true;
    }

    loadFromDisk(svgMapPath: string): boolean {
        try {
            if (!fs.existsSync(svgMapPath)) {
                return false;
            }
            const mapContent = fs.readFileSync(svgMapPath, 'utf8');
            const parsed = JSON.parse(mapContent);
            const isVersioned = parsed?.version === CURRENT_SVG_MAP_VERSION;

            if (
                !isObjectMap(parsed) ||
                (isVersioned &&
                    (!isObjectMap(parsed.flat) ||
                        !isObjectMap(parsed.byBinding)))
            ) {
                return false;
            }

            const flat = isVersioned ? parsed.flat : parsed;
            const byBinding = isVersioned ? parsed.byBinding : null;

            this.localSvgMap = Object.assign(Object.create(null), flat);
            this.localSvgMapByBinding = byBinding ?? {};
            this.allowFlatFallback = true;
            return true;
        } catch (err) {
            console.warn(
                '[buildSvgMap]: Failed to load SVG map from disk, falling back to codebase scan',
                err
            );
            return false;
        }
    }

    saveToDisk(svgMapPath: string): void {
        try {
            fs.writeFileSync(
                svgMapPath,
                JSON.stringify(
                    {
                        version: CURRENT_SVG_MAP_VERSION,
                        flat: this.localSvgMap,
                        byBinding: this.localSvgMapByBinding
                    },
                    null,
                    2
                ),
                'utf8'
            );
        } catch (err) {
            console.error('[buildSvgMap]: Failed to save SVG map to disk', err);
        }
    }

    setLocalSvgMapEntry(
        file: string,
        name: string,
        resolvedPath: string
    ): void {
        const entry = { path: resolvedPath };
        this.localSvgMap[name] = entry;
        const key = nodeKey(file, name);
        this.localSvgMapByBinding[key] = entry;
    }

    setFlatSvgMapEntry(name: string, resolvedPath: string): void {
        const entry = { path: resolvedPath };
        this.localSvgMap[name] = entry;
    }

    getLocalSvgEntry(currentFile: string, name: string): SvgEntry | undefined {
        if (!currentFile) {
            return this.localSvgMap[name];
        }
        const byBindingHit = this.localSvgMapByBinding[
            nodeKey(currentFile, name)
        ];
        if (byBindingHit) {
            return byBindingHit;
        }
        return this.allowFlatFallback ? this.localSvgMap[name] : undefined;
    }
}
