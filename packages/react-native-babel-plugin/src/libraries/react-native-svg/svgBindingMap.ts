/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import fs from 'fs';

import { exportNodeKey, nodeKey } from './nodeKeys';
import { getExportedName } from './specifierNames';

export type SvgEntry = { path: string; content?: string };

// The svg-map.json disk-cache format, wrapping both the flat map and its
// per-binding counterpart. Bumped whenever that shape changes; shared
// between the save and load paths so the two can't desync on the number.
const CURRENT_SVG_MAP_VERSION = 2;

/**
 * The name -> resolved-SVG-path mapping `buildSvgMap.ts`'s project scan
 * populates, and `ReactNativeSVG.processItem` consults at real transform
 * time. Encapsulates the two-map (flat + per-binding) design and the
 * disk-cache format in one place, so the scanner and the transform-time
 * lookup don't each need to know how the disambiguation actually works.
 */
export class SvgBindingMap {
    // A null prototype -- rather than a plain `{}` -- so a source-controlled
    // key that collides with an inherited name (`__proto__`, `constructor`,
    // `toString`, ...) is stored as an ordinary own property instead of
    // reaching through to Object.prototype's accessor/method of the same
    // name (which for `__proto__` specifically would reassign this object's
    // own prototype rather than add a property).
    localSvgMap: Record<string, SvgEntry> = Object.create(null);

    // `localSvgMap` above is kept flat/name-only for backward compatibility
    // (its public shape, and the disk-cache format), but that means two
    // DIFFERENT files each legitimately aliasing a DIFFERENT SVG under the
    // same local name can still overwrite each other there -- whichever
    // file's scan happens to run last silently wins. This second index is
    // keyed by `nodeKey(file, name)` (never a bare name, so it can't
    // collide with `Object.prototype` either) and is consulted first at
    // real transform time via `getLocalSvgEntry()`, so the two files above
    // each still resolve to their own correct entry. Each entry here is
    // the SAME object reference stored in `localSvgMap`, so lazily caching
    // `.content` (in LocalSvgHandler) updates both consistently.
    private localSvgMapByBinding: Record<string, SvgEntry> = {};

    // Whether `localSvgMapByBinding` holds ANY per-binding data at all for
    // this instance (fresh scan or loaded disk cache) -- not per-name, the
    // whole map. Once true, `getLocalSvgEntry` stops falling back to the
    // flat, name-only `localSvgMap` on a miss: with a fresh scan's full
    // `rootsReaching` propagation, every file that legitimately consumes a
    // resolved SVG (directly or through a re-export chain) gets its OWN
    // `localSvgMapByBinding` entry, so a miss means `name` genuinely isn't
    // reachable from THIS file -- falling back to the flat map at that
    // point would risk silently inheriting an entry that belongs to some
    // OTHER, unconnected file merely sharing the same text. The flat map
    // stays a safe fallback only while this is false, i.e. a legacy
    // (pre-versioned) disk cache with no per-binding data was loaded --
    // the same, historical, non-regressive behavior as before per-binding
    // disambiguation existed.
    private hasBindingData = false;

    /** Loads a previously-saved `svg-map.json` from `svgMapPath`, if one
     * exists, replacing both maps wholesale. Returns `true` when a cache
     * was found and loaded (however old its format), `false` when there
     * was nothing to load -- the caller should fall back to a fresh
     * project scan in that case. Never throws: a corrupt/unreadable cache
     * is logged and treated the same as "nothing to load". */
    loadFromDisk(svgMapPath: string): boolean {
        try {
            if (!fs.existsSync(svgMapPath)) {
                return false;
            }
            const mapContent = fs.readFileSync(svgMapPath, 'utf8');
            const parsed = JSON.parse(mapContent);
            // Versioned wrapper (current format, carrying both the flat
            // map and its per-binding counterpart) vs. a pre-existing
            // cache file written before `localSvgMapByBinding` existed,
            // which was just the flat map itself with no wrapper at all
            // -- still loadable, just without per-binding disambiguation
            // until the cache is regenerated.
            const flat =
                parsed?.version === CURRENT_SVG_MAP_VERSION
                    ? parsed.flat
                    : parsed;
            const byBinding =
                parsed?.version === CURRENT_SVG_MAP_VERSION
                    ? parsed.byBinding
                    : null;
            // `JSON.parse` always returns a plain (Object.prototype)
            // object -- re-home it onto a null prototype so a
            // `__proto__`/`constructor`-named entry persisted from a
            // previous scan can't reintroduce the same hazard here.
            this.localSvgMap = Object.assign(Object.create(null), flat);
            this.localSvgMapByBinding = byBinding ?? {};
            this.hasBindingData =
                Object.keys(this.localSvgMapByBinding).length > 0;
            return true;
        } catch (err) {
            console.warn(
                '[buildSvgMap]: Failed to load SVG map from disk, falling back to codebase scan',
                err
            );
            return false;
        }
    }

    /** Writes both maps to `svgMapPath`, wrapped with the current format
     * version. Never throws: a failed write is logged, not fatal to the
     * caller's scan that just produced this data. */
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

    /** Writes one `localSvgMap` entry, and its `localSvgMapByBinding`
     * counterpart(s) -- keyed by `nodeKey(file, name)` for `file`'s own
     * local scope (a direct `import` specifier, never a re-export -- see
     * `setFlatSvgMapEntry` for that case), AND, via `rootsReaching`, for
     * every OTHER file whose own JSX usage of some name legitimately
     * traces -- through the binding-edge chain `buildSvgMap.ts` builds --
     * to this exact `(file, name)`. All written entries share the SAME
     * object reference, so lazily caching `.content` (in LocalSvgHandler)
     * via any of them keeps the rest in sync. */
    setLocalSvgMapEntry(
        file: string,
        name: string,
        resolvedPath: string,
        rootsReaching: ReadonlyMap<string, ReadonlySet<string>>
    ): void {
        const entry = { path: resolvedPath };
        this.localSvgMap[name] = entry;
        const key = nodeKey(file, name);
        this.localSvgMapByBinding[key] = entry;
        this.hasBindingData = true;
        const consumers = rootsReaching.get(key);
        if (consumers) {
            for (const consumerRoot of consumers) {
                this.localSvgMapByBinding[consumerRoot] = entry;
            }
        }
    }

    /** Writes the flat `localSvgMap` entry, plus (via `rootsReaching`) a
     * `localSvgMapByBinding` entry for every file whose own JSX usage
     * traces to this exported name -- but never a `nodeKey(file, ...)`
     * entry for `file` itself, since a re-export declaration forwards a
     * name through `file`'s export table without ever introducing a
     * same-named LOCAL binding in `file`'s own scope. Writing that name
     * into `file`'s own local `nodeKey` space would be flat-out wrong,
     * not just imprecise, if `file` also happens to have an unrelated
     * LOCAL import bound to that same name -- `nodeKey(file, name)` would
     * then wrongly resolve a JSX usage of the real local import to this
     * re-export's target instead. A consuming file with no traced chain
     * of its own (absent from `rootsReaching`) gets no entry here at all
     * -- see `getLocalSvgEntry`/`hasBindingData` for why that's now
     * correct rather than a gap: once any fresh per-binding data exists,
     * a miss means genuinely unreachable, not merely undocumented. */
    setFlatSvgMapEntry(
        file: string,
        name: string,
        resolvedPath: string,
        rootsReaching: ReadonlyMap<string, ReadonlySet<string>>
    ): void {
        const entry = { path: resolvedPath };
        this.localSvgMap[name] = entry;
        const consumers = rootsReaching.get(exportNodeKey(file, name));
        if (consumers) {
            for (const consumerRoot of consumers) {
                this.localSvgMapByBinding[consumerRoot] = entry;
                this.hasBindingData = true;
            }
        }
    }

    /** Resolves the entry a real JSX usage of `name` while transforming
     * `currentFile` should use -- prefers the precise per-binding entry
     * (disambiguated by file) over the flat, name-only map, since two
     * different files can each legitimately alias a different SVG under
     * the same local name.
     *
     * Once `hasBindingData` is true, a `byBinding` miss returns `undefined`
     * directly rather than falling through to the flat map: a fresh
     * scan's `rootsReaching` propagation (see `buildSvgMap.ts`) already
     * gives every file that legitimately consumes a resolved SVG --
     * directly or through a re-export chain -- its OWN `byBinding` entry,
     * so a miss at this point means `name` genuinely isn't reachable from
     * `currentFile` at all. Falling back to the flat map there would risk
     * silently inheriting an entry that belongs to some OTHER, unconnected
     * file that merely happens to share the same text (e.g. a real
     * `<Icon/>` from a UI library colliding with an aliased SVG also
     * named `Icon` in an unrelated file). The flat map is only consulted
     * when `hasBindingData` is false, i.e. a legacy (pre-versioned) disk
     * cache with no per-binding data was loaded -- the same, historical,
     * non-regressive behavior as before per-binding disambiguation
     * existed. */
    getLocalSvgEntry(currentFile: string, name: string): SvgEntry | undefined {
        const byBindingHit = this.localSvgMapByBinding[
            nodeKey(currentFile, name)
        ];
        if (byBindingHit) {
            return byBindingHit;
        }
        return this.hasBindingData ? undefined : this.localSvgMap[name];
    }

    /** Populates `localSvgMap` (and, via `rootsReaching`,
     * `localSvgMapByBinding`) for each `ExportSpecifier` on an `export {
     * ... } from '...svg'` declaration, declared in `file`, once its
     * source has been resolved to a real `.svg` path. `nameFilter`
     * restricts which exported names actually get written: `null` means
     * "all of them" (the always-a-real-`.svg`-extension call site, where
     * every specifier is legitimately an SVG regardless of JSX usage); a
     * `Set` means "only these" (the bare/aliased-source call site, where
     * only the specific names proven reachable from a real JSX usage
     * should be populated -- writing the rest would risk a same-named,
     * unrelated component elsewhere being misidentified as this SVG).
     * Both call sites run only after `rootsReaching` has been computed
     * (see `buildSvgMap.ts`), even though the `nameFilter: null` case is
     * conceptually eager -- deferred so its `setFlatSvgMapEntry` calls
     * can still attribute a precise `localSvgMapByBinding` entry to
     * whichever file(s) actually consume it. */
    populateExportedSvgNames(
        t: typeof Babel.types,
        file: string,
        path: Babel.NodePath<Babel.types.ExportNamedDeclaration>,
        resolved: string,
        nameFilter: ReadonlySet<string> | null,
        rootsReaching: ReadonlyMap<string, ReadonlySet<string>>
    ): void {
        for (const spec of path.node.specifiers) {
            if (spec.type === 'ExportSpecifier') {
                const name = getExportedName(t, spec.exported);
                if (name && (!nameFilter || nameFilter.has(name))) {
                    this.setFlatSvgMapEntry(
                        file,
                        name,
                        resolved,
                        rootsReaching
                    );
                }
            } else {
                console.warn(
                    `[buildSvgMap]: Unhandled export specifier type: ${spec.type}`
                );
            }
        }
    }
}
