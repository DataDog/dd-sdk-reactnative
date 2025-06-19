/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import sourceMapString from 'metro/src/DeltaBundler/Serializers/sourceMapString';
// eslint-disable-next-line import/no-extraneous-dependencies
import type CountingSet from 'metro/src/lib/CountingSet';
import type { ReadOnlyGraph, Module, MixedOutput } from 'metro';

import type { DefaultConfigOptions } from './types/expoTypes';
import type {
    MetroSerializerOutput,
    MetroBundleWithMap,
    SourceMapString
} from './types/metroTypes';

/**
 * Lazy-init reference for {@link createCountingSet} resolved function.
 */
let createCountingSetFunc: (() => CountingSet<string>) | undefined;

/**
 * Lazy-init reference for {@link metroSourceMapString} resolved function.
 */
let sourceMapStringFunc: SourceMapString | undefined;

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
 * CountingSet was added in Metro 0.71.2 - a modified `Set` that only deletes items when the
 * number of `delete(item)` calls matches the number of `add(item)` calls.
 *
 * https://github.com/facebook/metro/commit/fc29a1177f883144674cf85a813b58567f69d545
 */
export const createCountingSet = () => {
    if (createCountingSetFunc) {
        return createCountingSetFunc();
    }

    try {
        createCountingSetFunc = () => {
            const {
                default: MetroCountingSet
                // eslint-disable-next-line global-require, import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
            } = require('metro/src/lib/CountingSet');
            return new MetroCountingSet();
        };
    } catch (_) {
        createCountingSetFunc = () =>
            (new Set() as unknown) as CountingSet<string>;
    }

    return createCountingSetFunc();
};
/**
 * In Metro versions prior to v0.80.10, `sourceMapString` was exported as a default export.
 * Starting with v0.80.10, it became a named export.
 *
 * @returns The resolved `sourceMapString` function, of type {@link SourceMapString}
 */
export const metroSourceMapString: SourceMapString = (
    modules: Module<MixedOutput>[],
    options: {
        excludeSource?: boolean;
        processModuleFilter?: (module: Module<MixedOutput>) => boolean;
        shouldAddToIgnoreList?: (module: Module<MixedOutput>) => boolean;
    }
): string => {
    if (sourceMapStringFunc) {
        return sourceMapStringFunc(modules, options);
    }

    if (typeof sourceMapString === 'function') {
        sourceMapStringFunc = sourceMapString;
    } else if (
        sourceMapString &&
        typeof sourceMapString === 'object' &&
        typeof sourceMapString['sourceMapString'] === 'function'
    ) {
        sourceMapStringFunc = (sourceMapString as {
            sourceMapString: SourceMapString;
        }).sourceMapString;
    }

    if (!sourceMapStringFunc) {
        throw new Error(
            "[DATADOG METRO PLUGIN] Cannot find sourceMapString function in 'metro/src/DeltaBundler/Serializers/sourceMapString'"
        );
    }

    return sourceMapStringFunc(modules, options);
};

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
    if (!getDefaultExpoConfigFunc) {
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
    } else {
        return getDefaultExpoConfigFunc(projectRoot, options);
    }
};
