/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 *
 * Portions of this code are adapted from Sentry's Metro configuration:
 * https://github.com/getsentry/sentry-react-native/blob/17c0c2e8913030e4826d055284a735efad637312/packages/core/src/js/tools/sentryMetroSerializer.ts
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import countLines from 'metro/src/lib/countLines';
import path from 'path';

import type {
    Bundle,
    MixedOutput,
    Module,
    MetroBundleWithMap,
    DatadogDebugIdModule
} from './types/metroTypes';
import { createCountingSet } from './utils';

/**
 * Regex to match the Debug ID comment in the bundle.
 */
const DEBUG_ID_BUNDLE_REGEX = /\/\/\s?([#@])\s?debugId=([\d\-a-zA-Z]*$)/m;

/**
 * Path name for the Debug ID Metro Virtual Module.
 */
export const DEBUG_ID_MODULE_PATH = '__datadog_debugid__';

/**
 * The initial placeholder for the injected Debug ID in the virtual module, replaced
 * later by the actual Debug ID.
 */
export const DEBUG_ID_PLACEHOLDER = '__datadog_debug_id_placeholder__';

/**
 * A comment that can be found at the end of the JS bundle, to specify the URL of the sourcemap.
 * Ref: https://tc39.es/ecma426/#sec-linking-inline
 */
export const SOURCE_MAP_COMMENT = '//# sourceMappingURL=';

/**
 * The comment that will be appended at the end of the JS bundle, to specify the Debug ID.
 * Ref: https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md
 */
export const DEBUG_ID_COMMENT = '//# debugId=';

/**
 * The Debug ID is injected in the virtual module as a plain string, using this prefix.
 * It is later retrieved by searching it in the bundle, using the same prefix.
 */
const DEBUG_ID_METADATA_PREFIX = 'datadog-debug-id-';

/**
 * Creates a virtual module to embed a debug ID into the bundle.
 * @param debugId - the debug ID to inject into the bundle, or a placeholder.
 * @returns The Debug ID virtual module.
 */
export const createDebugIdModule = (debugId: string): DatadogDebugIdModule => {
    let debugIdCode = createDebugIdSnippet(debugId);

    return {
        setSource: (code: string) => {
            debugIdCode = code;
        },
        dependencies: new Map(),
        getSource: () => Buffer.from(debugIdCode),
        inverseDependencies: createCountingSet(),
        path: DEBUG_ID_MODULE_PATH,
        output: [
            {
                type: 'js/script/virtual',
                data: {
                    code: debugIdCode,
                    lineCount: countLines(debugIdCode),
                    map: []
                }
            }
        ]
    };
};

/**
 * Injects the debug ID module into the list of pre-modules,
 * ensuring that the prelude module (if present) stays at the top
 * to correctly measure bundle startup time.
 */
export const addDebugIdModule = (
    preModules: readonly Module<MixedOutput>[],
    debugIdModule: DatadogDebugIdModule
): Module<MixedOutput>[] => {
    const result = [...preModules];
    const hasPrelude = result.length > 0 && result[0]?.path === '__prelude__';

    if (hasPrelude) {
        result.splice(1, 0, debugIdModule);
    } else {
        result.unshift(debugIdModule);
    }

    return result;
};

/**
 * Creates a minified JavaScript snippet that exposes the provided Debug ID
 * on the global scope at runtime.
 *
 * @param debugId - The Debug ID to be injected into the global scope.
 * @returns A minified JavaScript string that performs the injection.
 */
export const createDebugIdSnippet = (debugId: string) => {
    return `var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds&&(_datadogDebugIds={});try{var stack=(new Error).stack;stack&&(_datadogDebugIds[stack]="${debugId}",_datadogDebugIdMeta="${DEBUG_ID_METADATA_PREFIX}${debugId}")}catch(e){}`;
};

/**
 * Extracts the Debug ID from a bundle source string by locating the pattern
 * "{@link DEBUG_ID_METADATA_PREFIX}`[DEBUG-ID]`"
 *
 * @param code - The source code of the bundle to search within.
 * @returns The extracted Debug ID, or `undefined` if not found.
 */
export const getDebugIdFromBundleSource = (
    code: string
): string | undefined => {
    const match = code.match(
        new RegExp(
            `${DEBUG_ID_METADATA_PREFIX}([0-9a-fA-F]{8}\\b-(?:[0-9a-fA-F]{4}\\b-){3}[0-9a-fA-F]{12})`
        )
    );

    return match ? match[1] : undefined;
};

/**
 * Creates a unique Debug ID from the given bundle, by using the content of its modules.
 * @param bundle The bundle to create the Debug ID from.
 * @returns The computed Debug ID.
 */
export const createDebugIdFromBundle = (bundle: Bundle): string => {
    const hash = createHash('md5');
    hash.update(bundle.pre);
    for (const [, code] of bundle.modules) {
        hash.update(code);
    }

    hash.update(bundle.post);

    return createDebugIdFromString(hash.digest('hex'));
};

/**
 * Creates a unique Debug ID from the given string.
 * Ref: https://github.com/expo/expo/blob/94a124894a355ad6e24f4bac5144986380686157/packages/%40expo/metro-config/src/serializer/debugId.ts#L15
 * @param str The string to create the Debug ID from.
 * @returns The computed Debug ID.
 */
export const createDebugIdFromString = (str: string): string => {
    const md5sum = createHash('md5');
    md5sum.update(str);
    const md5Hash = md5sum.digest('hex');

    // Position 16 is fixed to either 8, 9, a, or b in the uuid v4 spec (10xx in binary)
    // RFC 4122 section 4.4
    const v4variant = ['8', '9', 'a', 'b'][
        md5Hash.substring(16, 17).charCodeAt(0) % 4
    ] as string;

    return `${md5Hash.substring(0, 8)}-${md5Hash.substring(
        8,
        12
    )}-4${md5Hash.substring(13, 16)}-${v4variant}${md5Hash.substring(
        17,
        20
    )}-${md5Hash.substring(20)}`.toLowerCase();
};

/**
 * Injects the given debug ID in the given code, and returns the modified code.
 *
 * It looks for a specific placeholder defined in {@link DEBUG_ID_PLACEHOLDER}, and replaces
 * all its occurences with the given Debug ID.
 * @param code The code to inject the Debug ID into.
 * @param debugId The Debug ID to inject.
 * @returns The modified code with the injected Debug ID.
 */
export const injectDebugIdInCode = (code: string, debugId: string): string => {
    return code.replace(new RegExp(DEBUG_ID_PLACEHOLDER, 'g'), debugId);
};

/**
 * Injects the given Debug ID in the given code (as a comment at the end of the file), and in the
 * given sourcemap (as a top-level JSON property).
 * @param debugId The Debug ID to inject.
 * @param code The code to inject the Debug ID in.
 * @param sourcemap The sourcemap to inject the Debug ID in.
 * @returns The modified {@link MetroBundleWithMap} with the Debug ID
 */
export const injectDebugIdInCodeAndSourceMap = (
    debugId: string,
    code: string,
    sourcemap: string
): MetroBundleWithMap => {
    let codeWithDebugId = code;

    if (_isDebugIdInBundle(debugId, code)) {
        codeWithDebugId = _replaceDebugIdInBundle(debugId, code);
    } else {
        codeWithDebugId = _insertDebugIdCommentInBundle(debugId, code);
    }

    // Insert the Debug ID as a top-level property of the sourcemap
    const bundleMap: Record<string, unknown> = JSON.parse(sourcemap);
    bundleMap['debugId'] = debugId;

    // Write the Debug ID in a temporary file
    writeDebugIdToFile(debugId);

    return { code: codeWithDebugId, map: JSON.stringify(bundleMap) };
};

const writeDebugIdToFile = (debugId: string): void => {
    try {
        const datadogPackageJsonPath = require.resolve(
            '@datadog/mobile-react-native/package.json'
        );
        const datadogTmpDir = path.join(
            path.dirname(datadogPackageJsonPath),
            '.tmp'
        );
        const debugIdFilePath = path.join(datadogTmpDir, 'debug_id');

        // Remove the existing Debug ID file if it exists
        if (existsSync(debugIdFilePath)) {
            unlinkSync(debugIdFilePath);
        }

        if (!existsSync(datadogTmpDir)) {
            mkdirSync(datadogTmpDir);
        }

        writeFileSync(debugIdFilePath, debugId, 'utf8');
    } catch (error) {
        console.warn(
            '[DATADOG METRO PLUGIN] Failed to write Debug ID to file:',
            error
        );
    }
};

/**
 * [INTERNAL] Checks if the debug ID is in the bundle, and prints a warning if it does not match the given one.
 */
export const _isDebugIdInBundle = (
    debugId: string,
    bundleCode: string
): boolean => {
    const match = bundleCode.match(DEBUG_ID_BUNDLE_REGEX);
    if (!match || match.length < 2) {
        return false;
    }

    if (match[2] !== debugId) {
        console.warn(
            '[DATADOG METRO PLUGIN] The debug ID found in the file does not match the calculated debug ID.'
        );
    }

    return true;
};

/**
 * Checks if the virtual Debug ID module exists in the given modules.
 * @param modules - The list of modules in which to look for the Debug ID.
 * @returns `true` if the Debug ID module exists, `false` otherwise.
 */
export const checkIfDebugIdModuleExists = (
    modules: readonly Module[]
): boolean =>
    modules.findIndex(module => module.path === DEBUG_ID_MODULE_PATH) !== -1;

/**
 * [INTERNAL] Replaces the existing Debug ID comment in the bundle with a new one, containing the given Debug ID.
 */
export const _replaceDebugIdInBundle = (
    debugId: string,
    bundleCode: string
): string => {
    return bundleCode.replace(
        DEBUG_ID_BUNDLE_REGEX,
        `${DEBUG_ID_COMMENT}${debugId}`
    );
};

/**
 * [INTERNAL] Inserts the Debug ID comment in the bundle in the correct position.
 */
export const _insertDebugIdCommentInBundle = (
    debugId: string,
    bundleCode: string
): string => {
    const debugIdComment = `${DEBUG_ID_COMMENT}${debugId}`;
    const indexOfSourceMapComment = bundleCode.lastIndexOf(SOURCE_MAP_COMMENT);
    if (indexOfSourceMapComment === -1) {
        return `${bundleCode}\n${debugIdComment}`;
    }
    const before = bundleCode.substring(0, indexOfSourceMapComment);
    const after = bundleCode.substring(indexOfSourceMapComment);
    return `${before}${debugIdComment}\n${after}`;
};
