/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type baseJSBundle from 'metro/private/DeltaBundler/Serializers/baseJSBundle';
import type sourceMapString from 'metro/private/DeltaBundler/Serializers/sourceMapString';
import type bundleToString from 'metro/private/lib/bundleToString';
import type countLines from 'metro/private/lib/countLines';
import type CountingSet from 'metro/src/lib/CountingSet';
import type { ReadOnlyGraph, Module, MixedOutput } from 'metro';

import type { DefaultConfigOptions } from './types/expoTypes';
import type {
    MetroSerializerOutput,
    MetroBundleWithMap
} from './types/metroTypes';

/**
 * Lazy-init cache for modules loaded through `safeRequireDefaultExport`.
 */
const lazyLoadedModules: { [key: string]: any } = {};

/**
 * Lazy-init reference for {@link getSourceMapStringFunction} resolved function.
 */
let sourceMapStringFunction: typeof sourceMapString | undefined;

/**
 * Safely loads and returns the `baseJSBundle` function from Metro's internal modules.
 * Supports multiple Metro versions with different internal paths.
 */
export const getBaseJSBundleFunction = (): typeof baseJSBundle =>
    lazyRequireDefaultExport([
        'metro/private/DeltaBundler/Serializers/baseJSBundle',
        'metro/src/DeltaBundler/Serializers/baseJSBundle'
    ]);

/**
 * Safely loads and returns the `countLines` function from Metro's internal modules.
 * Supports multiple Metro versions with different internal paths.
 */
export const getCountLinesFunction = (): typeof countLines =>
    lazyRequireDefaultExport([
        'metro/private/lib/countLines',
        'metro/src/lib/countLines'
    ]);

/**
 * Safely loads and returns the `bundleToString` function from Metro's internal modules.
 * Supports multiple Metro versions with different internal paths.
 */
export const getBundleToStringFunction = (): typeof bundleToString =>
    lazyRequireDefaultExport([
        'metro/private/lib/bundleToString',
        'metro/src/lib/bundleToString'
    ]);

/**
 * CountingSet was added in Metro 0.71.2 - a modified `Set` that only deletes items when the
 * number of `delete(item)` calls matches the number of `add(item)` calls.
 *
 * https://github.com/facebook/metro/commit/fc29a1177f883144674cf85a813b58567f69d545
 */
export const getCreateCountingSetFunction: () => () => CountingSet<string> = () => {
    const CountingSetClass = safeLazyRequireDefaultExport<typeof CountingSet>([
        'metro/private/lib/CountingSet',
        'metro/src/lib/CountingSet'
    ]);

    return CountingSetClass
        ? () => new CountingSetClass<string>()
        : () => (new Set() as unknown) as CountingSet<string>;
};

/**
 * Lazy-init reference for {@link getDefaultExpoConfig} resolved function.
 */
let getDefaultExpoConfigFunc:
    | ((
          projectRoot: string,
          options: DefaultConfigOptions
      ) => DefaultConfigOptions)
    | undefined;

/**
 * In Metro versions prior to v0.80.10, `sourceMapString` was exported as a default export.
 * Starting with v0.80.10, it became a named export.
 *
 * @returns The resolved `sourceMapString` function, of type {@link sourceMapString}
 */
export const getSourceMapStringFunction = (): typeof sourceMapString => {
    if (sourceMapStringFunction) {
        return sourceMapStringFunction;
    }

    const sourceMapStringModule = safeRequireDefaultExport([
        'metro/private/DeltaBundler/Serializers/sourceMapString',
        'metro/src/DeltaBundler/Serializers/sourceMapString'
    ]);

    if (typeof sourceMapStringModule === 'function') {
        sourceMapStringFunction = sourceMapStringModule as typeof sourceMapString;
    } else if (
        sourceMapStringModule &&
        typeof sourceMapStringModule === 'object' &&
        typeof (sourceMapStringModule as { sourceMapString: any })[
            'sourceMapString'
        ] === 'function'
    ) {
        sourceMapStringFunction = (sourceMapStringModule as {
            sourceMapString: typeof sourceMapString;
        }).sourceMapString;
    }

    if (!sourceMapStringFunction) {
        throw new Error(
            "[DATADOG METRO PLUGIN] Unexpected error: Cannot resolve sourceMapString function from Metro's internal modules."
        );
    }

    return sourceMapStringFunction;
};

/**
 * This function ensures that modules in source maps are sorted in the same
 * order as in a plain JS bundle.
 *
 * https://github.com/facebook/metro/blob/76413561abb3757285e0cb0305f1f9f616fa2b6c/packages/metro/src/Server.js#L1086C1-L1095C7
 */
export function getSortedModules(
    graph: ReadOnlyGraph,
    { createModuleId }: { createModuleId: (file: string) => number }
): readonly Module<MixedOutput>[] {
    const modules = [...graph.dependencies.values()];

    // Assign IDs to modules in a consistent order
    for (const module of modules) {
        createModuleId(module.path);
    }
    // Sort by IDs
    return modules.sort(
        (a: Module<MixedOutput>, b: Module<MixedOutput>) =>
            createModuleId(a.path) - createModuleId(b.path)
    );
}

/**
 * Converts the serializer result of type {@link MetroSerializerOutput} to {@link MetroBundleWithMap}.
 */
export const convertSerializerOutput = async (
    output: MetroSerializerOutput
): Promise<MetroBundleWithMap> => {
    const parse = (obj: MetroSerializerOutput) => {
        // Plain String
        if (typeof obj === 'string') {
            return { code: obj, map: '{}' };
        }

        // Dictionary
        if ('map' in obj) {
            return { code: obj.code, map: obj.map };
        }

        return undefined;
    };

    const value = parse(output);
    if (!value) {
        return parse(await output) ?? { code: '', map: '{}' };
    } else {
        return value;
    }
};

/**
 * Gets the default Expo configuration options.
 */
export const getDefaultExpoConfig = (
    projectRoot: string,
    options: DefaultConfigOptions
): DefaultConfigOptions => {
    if (getDefaultExpoConfigFunc) {
        return getDefaultExpoConfigFunc(projectRoot, options);
    }
    try {
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const metroConfig = require('expo/metro-config');
        getDefaultExpoConfigFunc = metroConfig.getDefaultConfig;
        return metroConfig.getDefaultConfig(projectRoot, options);
    } catch (e) {
        throw new Error(
            'Cannot load `expo/metro-config`. Make sure Expo is properly set up in your project.'
        );
    }
};

/**
 * Safely requires a module from multiple possible paths, returning its default export if found.
 * Caches the result to avoid redundant requires.
 * Useful for supporting multiple Metro versions with different internal paths.
 * @param modulePaths The list of possible module paths to try.
 * @returns the default export of the first successfully required module.
 * @throws if none of the module paths could be resolved.
 */
export const lazyRequireDefaultExport = <T>(modulePaths: string[]): T => {
    const resolvedModule = safeLazyRequireDefaultExport<T>(modulePaths);
    if (!resolvedModule) {
        throw new Error(
            `[DATADOG METRO PLUGIN] Unexpected error: cannot find module in any of the following paths: ${modulePaths.join(
                ', '
            )}`
        );
    }
    return resolvedModule;
};

/**
 * Safely requires a module from multiple possible paths, returning its default export if found.
 * Caches the result to avoid redundant requires.
 * Useful for supporting multiple Metro versions with different internal paths.
 * @param modulePaths The list of possible module paths to try.
 * @returns the default export of the first successfully required module, or `undefined` if none could be resolved.
 */
export const safeLazyRequireDefaultExport = <T>(
    modulePaths: string[]
): T | undefined => {
    const cacheKey = modulePaths.join('|');
    if (lazyLoadedModules[cacheKey]) {
        return lazyLoadedModules[cacheKey] as T;
    }

    const resolvedModule = safeRequireDefaultExport<T>(modulePaths);

    lazyLoadedModules[cacheKey] = resolvedModule;
    return resolvedModule;
};

/**
 * Safely requires a module from multiple possible paths, returning its default export if found.
 * Useful for supporting multiple Metro versions with different internal paths.
 * @param modulePaths The list of possible module paths to try.
 * @returns the default export of the first successfully required module, or `undefined` if none could be resolved.
 */
export function safeRequireDefaultExport<T>(
    modulePaths: string[]
): T | undefined {
    let resolvedModule: T | undefined;
    for (const modulePath of modulePaths) {
        try {
            // eslint-disable-next-line global-require, import/no-extraneous-dependencies, @typescript-eslint/no-var-requires, import/no-dynamic-require
            const mod = require(modulePath);
            const defaultExport = getDefaultExport<T>(mod);
            if (defaultExport) {
                return defaultExport;
            }
        } catch (_) {
            // Try next path
        }
    }

    return resolvedModule;
}

/**
 * Safely extracts the default export from a module, if it exists.
 * Useful for supporting both CommonJS and ESM-syntax exports.
 * Supports upcoming Metro v0.83.2 https://github.com/facebook/metro/commit/5d301d7177af455fc6a94a0ba464639677cdf4b4.
 */
export function getDefaultExport<T>(module: { default: T } | T): T | undefined {
    if (!module) {
        return undefined;
    }

    if (typeof module === 'object' && 'default' in module) {
        return module.default as T;
    } else {
        return module as T;
    }
}
