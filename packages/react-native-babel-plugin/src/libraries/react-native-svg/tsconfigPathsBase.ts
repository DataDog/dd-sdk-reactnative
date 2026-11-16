/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import pathN from 'path';

type RawConfig = {
    extends?: unknown;
    compilerOptions?: { paths?: unknown };
};

// tsconfig.json and jsconfig.json allow comments and trailing commas.
function parseConfig(text: string): RawConfig | null {
    let out = '';
    let pendingComma = -1;
    for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '/' && text[i + 1] === '/') {
            const end = text.indexOf('\n', i);
            i = end === -1 ? text.length : end - 1;
            continue;
        }
        if (ch === '/' && text[i + 1] === '*') {
            const end = text.indexOf('*/', i + 2);
            i = end === -1 ? text.length : end + 1;
            continue;
        }
        if (/\s/.test(ch)) {
            out += ch;
            continue;
        }
        if ((ch === '}' || ch === ']') && pendingComma !== -1) {
            out = out.slice(0, pendingComma) + out.slice(pendingComma + 1);
        }
        pendingComma = ch === ',' ? out.length : -1;
        if (ch === '"') {
            const start = i;
            for (i++; i < text.length && text[i] !== '"'; i++) {
                if (text[i] === '\\') {
                    i++;
                }
            }
            out += text.slice(start, i + 1);
            continue;
        }
        out += ch;
    }

    try {
        const parsed = JSON.parse(out);
        return parsed !== null &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
            ? parsed
            : null;
    } catch {
        return null;
    }
}

// Mirrors how tsconfig-paths locates extended configs, so this walks the same
// chain that its loadConfig merged.
function resolveExtends(configPath: string, value: string): string {
    const extended = value.includes('.json') ? value : `${value}.json`;
    const dir = pathN.dirname(configPath);
    const candidate = pathN.join(dir, extended);
    if (
        extended.includes('/') &&
        extended.includes('.') &&
        !fs.existsSync(candidate)
    ) {
        return pathN.join(dir, 'node_modules', extended);
    }
    return candidate;
}

/**
 * Returns the directory of the config whose `paths` win the `extends` merge.
 * Without a baseUrl, TypeScript resolves `paths` against that directory, but
 * tsconfig-paths uses the directory of the config it was loaded from.
 */
export function findPathsBaseDir(
    configPath: string,
    seen: Set<string> = new Set()
): string | null {
    if (seen.has(configPath)) {
        return null;
    }
    seen.add(configPath);

    let config: RawConfig | null;
    try {
        config = parseConfig(fs.readFileSync(configPath, 'utf8'));
    } catch {
        return null;
    }
    if (!config) {
        return null;
    }
    if (config.compilerOptions?.paths) {
        return pathN.dirname(configPath);
    }

    const bases = (Array.isArray(config.extends)
        ? config.extends
        : [config.extends]
    ).filter((base): base is string => typeof base === 'string');
    // Later entries override earlier ones, so they are searched first.
    for (let i = bases.length - 1; i >= 0; i--) {
        const dir = findPathsBaseDir(
            resolveExtends(configPath, bases[i]),
            seen
        );
        if (dir) {
            return dir;
        }
    }
    return null;
}
