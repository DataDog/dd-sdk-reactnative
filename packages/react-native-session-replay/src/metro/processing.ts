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
 * Merges all individual SVG files into assets.bin and creates an index in assets.json.
 * This function reads all .svg files from the assets directory and packs them into
 * a single binary file with an accompanying JSON index for efficient lookup.
 *
 * @param assetsDir - Absolute path to the assets directory
 */
export function mergeSvgAssets(assetsDir: string) {
    const binName = 'assets.bin';
    const jsonName = 'assets.json';

    const binPath = path.resolve(assetsDir, binName);
    const jsonPath = path.resolve(assetsDir, jsonName);

    let index: SvgIndex = {};
    let offset = 0;

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    if (fs.existsSync(binPath) && fs.existsSync(jsonPath)) {
        try {
            index = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as SvgIndex;
            offset = fs.statSync(binPath).size;
        } catch (err) {
            console.warn(
                '[mergeSvgAssets] Failed to read index, starting fresh:',
                err
            );

            index = {};
            offset = 0;

            if (fs.existsSync(binPath)) {
                fs.unlinkSync(binPath);
            }
            if (fs.existsSync(jsonPath)) {
                fs.unlinkSync(jsonPath);
            }
        }
    } else {
        if (fs.existsSync(binPath)) {
            fs.unlinkSync(binPath);
        }
        if (fs.existsSync(jsonPath)) {
            fs.unlinkSync(jsonPath);
        }
    }

    const files = fs.readdirSync(assetsDir).sort();
    let added = 0;

    for (const f of files) {
        if (f === binName || f === jsonName) {
            continue;
        }

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
                `[SessionReplayAggregator] Failed to process ${f}:`,
                err
            );
        }
    }

    fs.writeFileSync(jsonPath, JSON.stringify(index, null, 2));
    if (added > 0) {
        console.log(
            `[SessionReplayAggregator] Packed ${added} new Session Replay SVG assets → total: ${
                Object.keys(index).length
            }`
        );
    }
}
