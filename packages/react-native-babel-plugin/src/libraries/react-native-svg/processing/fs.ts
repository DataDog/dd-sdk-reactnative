/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import path from 'path';

/**
 * Finds the module path by walking up the directory tree.
 * It starts with the current directory and goes up the tree in case we're dealing with monorepos.
 *
 * @param moduleName - The name of the module to find.
 * @param startPath - The directory to start searching from (defaults to cwd).
 * @returns The absolute path to the module, or null if not found.
 */
function findModulePath(
    moduleName: string,
    startPath: string = process.cwd()
): string | null {
    const maxDepth = 5;
    let depth = 0;
    let currentPath = startPath;

    while (depth < maxDepth) {
        const modulePath = path.join(currentPath, 'node_modules', moduleName);

        if (fs.existsSync(modulePath)) {
            return modulePath;
        }

        const parentPath = path.dirname(currentPath);

        // Reached the root without finding the module
        if (parentPath === currentPath) {
            break;
        }

        currentPath = parentPath;
        depth++;
    }

    return null;
}

/**
 * Determines the output path for storing transformed SVG assets.
 * In production mode (no `pluginDev` env flag), it targets the Session Replay node module.
 * In development mode (`pluginDev=true`), it writes to a local `./assets` directory.
 *
 * @returns  Absolute path to the directory where assets should be written.
 */
export function getAssetsPath() {
    const hasDevFlag = process.env.pluginDev;
    const moduleName = '@datadog/mobile-react-native-session-replay';

    if (!hasDevFlag) {
        const modulePath = findModulePath(moduleName);

        if (!modulePath) {
            return null;
        }

        return path.join(modulePath, 'assets');
    }

    return path.resolve('./assets');
}

/**
 * Ensures that the given assets directory exists.
 * If it does not exist, creates it using `fs.mkdirSync`.
 *
 * @param assetsPath - Absolute path to the assets directory.
 */
export function ensureAssetsDir(assetsPath: string) {
    try {
        fs.accessSync(assetsPath, fs.constants.F_OK);
    } catch (error) {
        fs.mkdirSync(assetsPath);
    }
}

/**
 * Deletes all files (non-recursively) in the provided assets directory.
 * Only removes files, leaving subdirectories untouched.
 *
 * @param assetsPath - Absolute path to the assets directory to clear.
 */
export function clearAssetsDir(assetsPath: string) {
    try {
        const files = fs.readdirSync(assetsPath);
        for (const file of files) {
            const filePath = path.join(assetsPath, file);

            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    } catch (error) {
        console.error('[clearAssetsDir]: ', error);
    }
}

