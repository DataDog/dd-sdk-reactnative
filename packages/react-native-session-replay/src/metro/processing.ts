/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import path from 'path';

type SvgIndexEntry = {
    offset: number;
    length: number;
};

type SvgIndex = Record<string, SvgIndexEntry>;

/**
 * Removes the binary and JSON asset files from the specified directory.
 * This is used to clean up corrupted or partial asset files before regenerating them.
 *
 * @param binPath - Absolute path to the assets.bin file
 * @param jsonPath - Absolute path to the assets.json file
 */
function cleanupFiles(binPath: string, jsonPath: string) {
    try {
        fs.unlinkSync(binPath);
    } catch (err) {
        console.warn('[cleanupFiles] Failed to cleanup binary assets', err);
    }

    try {
        fs.unlinkSync(jsonPath);
    } catch (err) {
        console.warn('[cleanupFiles] Failed to cleanup json assets', err);
    }
}

/**
 * Merges all individual SVG files into assets.bin and creates an index in assets.json.
 * This function reads all .svg files from the assets directory and packs them into
 * a single binary file with an accompanying JSON index for efficient lookup.
 *
 * @param assetsDir - Absolute path to the assets directory
 */
export function mergeSvgAssets(assetsDir: string) {
    try {
        const binName = 'assets.bin';
        const jsonName = 'assets.json';

        const binPath = path.resolve(assetsDir, binName);
        const jsonPath = path.resolve(assetsDir, jsonName);

        let index: SvgIndex = {};
        let offset = 0;

        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        try {
            const jsonData = fs.readFileSync(jsonPath, 'utf8');
            const binStats = fs.statSync(binPath);

            index = JSON.parse(jsonData) as SvgIndex;
            offset = binStats.size;
        } catch (err) {
            console.warn(
                '[mergeSvgAssets] Assets missing or corrupted, starting fresh'
            );
            index = {};
            offset = 0;
            cleanupFiles(binPath, jsonPath);
        }

        const files = fs
            .readdirSync(assetsDir)
            .filter(f => f.endsWith('.svg'))
            .sort();

        let added = 0;

        for (const f of files) {
            const id = path.basename(f, path.extname(f));
            if (index[id]) {
                continue;
            }

            try {
                const svg = fs.readFileSync(path.join(assetsDir, f), 'utf8');
                const buf = Buffer.from(svg, 'utf8');
                const length = buf.length;

                fs.appendFileSync(binPath, buf);
                index[id] = { offset, length };
                offset += length;
                added++;
            } catch (err) {
                console.warn(
                    `[SessionReplayAssetBundler] Failed to process ${f}:`,
                    err
                );
            }
        }

        fs.writeFileSync(jsonPath, JSON.stringify(index, null, 2));
        if (added > 0) {
            console.info(
                `[SessionReplayAssetBundler] Packed ${added} new Session Replay SVG assets → total: ${
                    Object.keys(index).length
                }`
            );
        }
    } catch (err) {
        console.error(
            '[mergeSvgAssets] Unexpected error during asset merge',
            err
        );
    }
}
