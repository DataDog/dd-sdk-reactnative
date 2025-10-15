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

/**
 * Writes a given SVG asset to disk using a hash-based filename.
 *
 * The asset is first written to a temporary file (`<nativeID>.svg`) to avoid race conditions
 * when multiple workers attempt to write simultaneously. Once successfully written,
 * the file is renamed to `<hash>.svg`. If a file with the same hash already exists,
 * the temporary file is removed to prevent duplicates.
 *
 * @param assetsPath - Absolute path to the assets directory where the file should be stored.
 * @param nativeID - Unique identifier of the source component or view.
 * @param hash - Hash string used as the final filename to ensure uniqueness.
 * @param svgCode - The SVG string content to be written to disk.
 * @returns `true` if a new file was written, or `false` if the file already existed or an error occurred.
 */
export function writeAssetToDisk(
    assetsPath: string,
    nativeID: string,
    hash: string,
    svgCode: string
): boolean {
    try {
        const tmpPath = path.join(assetsPath, `${nativeID}.svg`);
        const outputPath = path.join(assetsPath, `${hash}.svg`);

        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }

        // Write first to a tmp file to prevent multiple workers from trying to write to the same path
        fs.writeFileSync(tmpPath, svgCode);

        // Once finished, rename the file
        // If multiple workers get the same hash, the last one wins, but the content should always be valid
        if (!fs.existsSync(outputPath)) {
            fs.renameSync(tmpPath, outputPath);
            return true;
        }

        fs.unlinkSync(tmpPath);
        return false;
    } catch (error) {
        console.error('[writeJSONToDisk]: ', error);
        return false;
    }
}
