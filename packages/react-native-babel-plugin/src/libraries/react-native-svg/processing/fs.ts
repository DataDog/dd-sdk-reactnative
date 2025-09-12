/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import path from 'path';

/**
 * Determines the output path for storing transformed SVG assets.
 * In production mode (no `pluginDev` env flag), it targets the Session Replay node module.
 * In development mode (`pluginDev=true`), it writes to a local `./assets` directory.
 *
 * @returns  Absolute path to the directory where assets should be written.
 */
export function getAssetsPath() {
    const hasDevFlag = process.env.pluginDev;
    const modulePath =
        'node_modules/@datadog/mobile-react-native-session-replay';

    if (!hasDevFlag) {
        return path.resolve(modulePath);
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
