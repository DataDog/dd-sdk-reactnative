/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 *
 * Portions of this code are adapted from Sentry's Metro configuration:
 * https://github.com/getsentry/sentry-react-native/blob/17c0c2e8913030e4826d055284a735efad637312/packages/core/src/js/tools/sentryMetroSerializer.ts
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import baseJSBundle from 'metro/src/DeltaBundler/Serializers/baseJSBundle';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleToString from 'metro/src/lib/bundleToString';

import {
    DEBUG_ID_PLACEHOLDER,
    addDebugIdModule,
    checkIfDebugIdModuleExists,
    createDebugIdFromBundle,
    createDebugIdModule,
    getDebugIdFromBundleSource,
    injectDebugIdInCode,
    injectDebugIdInCodeAndSourceMap
} from './debugIdHelper';
import type {
    Bundle,
    DatadogDebugIdModule,
    DatadogMetroSerializer,
    MetroSerializer,
    MixedOutput,
    Module,
    ReadOnlyGraph
} from './types/metroTypes';
import {
    convertSerializerOutput as getMetroBundleWithMap,
    getSortedModules,
    metroSourceMapString
} from './utils';

/**
 * Creates a Metro serializer that adds a Debug ID module to the bundle.
 * This module injects the Debug ID at runtime, making it globally accessible.
 *
 * @param customSerializer - Optional custom {@link MetroSerializer}. If provided, you are responsible
 * for invoking `options.datadogBundleCallback` within it.
 */
export const createDatadogMetroSerializer = (
    customSerializer?: MetroSerializer
): DatadogMetroSerializer => {
    const serializer = customSerializer || createDefaultMetroSerializer();
    return async (entryPoint, preModules, graph, options) => {
        // Skip for hot reload mode
        if (graph.transformOptions.hot) {
            return serializer(entryPoint, preModules, graph, options);
        }

        // Make sure we don't add the Debug ID module twice
        if (checkIfDebugIdModuleExists(preModules)) {
            return serializer(entryPoint, preModules, graph, options);
        }

        // Create a virtual module to inject the Debug ID in a globally accessible property
        const debugIdModule = createDebugIdModule(DEBUG_ID_PLACEHOLDER);

        // Set the datadogBundleCallback in the options, to be used later by the serializer
        options.datadogBundleCallback = createDatadogBundleCallback(
            debugIdModule
        );

        // Add the Debug ID virtual module to the pre-modules
        const preModulesWithDebugId = addDebugIdModule(
            preModules,
            debugIdModule
        );

        // Run serializer
        const serializerOutput = serializer(
            entryPoint,
            preModulesWithDebugId,
            graph,
            options
        );

        // Get serialized code and sourcemap
        const { code, map } = await getMetroBundleWithMap(serializerOutput);

        // Retrieve the Debug ID, previously injected as a snippet of code in a virtual module by `datadogBundleCallback`.
        const debugId = getDebugIdFromBundleSource(code);
        if (!debugId) {
            throw new Error(
                '[DATADOG METRO PLUGIN] Debug ID was not found in the bundle. Call `options.datadogBundleCallback` if you are using a custom serializer.'
            );
        }

        // Inject the Debug ID as a comment in the bundle, and as a top-level property in the sourcemap.
        const result = injectDebugIdInCodeAndSourceMap(debugId, code, map);

        return result;
    };
};

/**
 * Creates a Metro Bundle Serializer like metro does by default, while also calling the datadogBundleCallback.
 * https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/Server.js#L272-L307
 */
export const createDefaultMetroSerializer = (): MetroSerializer => {
    return (entryPoint, preModules, graph, options) => {
        // Default metro bundle
        // https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/DeltaBundler/Serializers/baseJSBundle.js#L25
        let bundle = baseJSBundle(entryPoint, preModules, graph, options);

        // Modify the bundle through the datadogBundleCallback, if we are not in hot-reload mode
        if (
            (options as any).datadogBundleCallback &&
            !graph.transformOptions.hot
        ) {
            bundle = (options as any).datadogBundleCallback(bundle);
        }

        // Retrieves the processed code from the bundle
        const { code } = bundleToString(bundle);

        // If we are in hot-reload mode, we skip sourcemaps generation, and only return the code.
        if (graph.transformOptions.hot) {
            return code;
        }

        // Force generation of sourcemaps
        const map = metroSourceMapString(
            [...preModules, ...getSortedModules(graph, options)],
            {
                processModuleFilter: options.processModuleFilter,
                shouldAddToIgnoreList: options.shouldAddToIgnoreList
            }
        );

        return { code, map };
    };
};

/**
 * Creates a callback used to transform the given bundle by injecting the Debug ID snippet.
 * @param debugIdModule - The virtual Debug ID module
 * @returns The bundle callback
 */
export const createDatadogBundleCallback = (
    debugIdModule: DatadogDebugIdModule
) => {
    return (bundle: Bundle) => {
        const debugId = createDebugIdFromBundle(bundle);
        const code = debugIdModule.getSource().toString();
        debugIdModule.setSource(injectDebugIdInCode(code, debugId));
        bundle.pre = injectDebugIdInCode(bundle.pre, debugId);
        return bundle;
    };
};

/**
 * Adds Debug ID module for runtime injection, used for Expo.
 */
export function unstable_beforeAssetSerializationPlugin({
    premodules,
    debugId
}: {
    graph: ReadOnlyGraph<MixedOutput>;
    premodules: Module[];
    debugId?: string;
}): Module[] {
    if (!debugId || checkIfDebugIdModuleExists(premodules)) {
        return premodules;
    }
    return [...addDebugIdModule(premodules, createDebugIdModule(debugId))];
}
