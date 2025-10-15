#!/usr/bin/env node
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transformSync } from '@babel/core';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';

import babelPlugin from '../index';
import {
    clearAssetsDir,
    getAssetsPath
} from '../libraries/react-native-svg/processing/fs';

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
function mergeSvgAssets(assetsDir: string) {
    try {
        const binName = 'assets.bin';
        const jsonName = 'assets.json';

        const binPath = path.resolve(assetsDir, binName);
        const jsonPath = path.resolve(assetsDir, jsonName);
        const index: SvgIndex = {};

        let offset = 0;

        // Read SVG files from directory
        let files: string[] = [];
        files = fs
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
                console.warn(`[mergeSvgAssets] Failed to process ${f}:`, err);
            }
        }

        // Write final index
        try {
            fs.writeFileSync(jsonPath, JSON.stringify(index, null, 2));
        } catch (err) {
            console.error('[mergeSvgAssets] Failed to write assets index', err);
            return;
        }

        if (added > 0) {
            console.log(
                `\nPacked ${added} new Session Replay assets -> total: ${
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

/**
 * CLI tool to pre-generate SVG assets for Session Replay.
 *
 * This command scans the user's codebase for React components that use SVG elements,
 * processes them through the Datadog Babel plugin, and extracts assets
 * into the Session Replay module's assets directory.
 *
 * This should be ran before `pod install` on iOS to ensure that native asset
 * references are available during the build process.
 *
 * Usage:
 *   npx @datadog/mobile-react-native-babel-plugin generate-sr-assets
 *   or
 *   npx datadog-generate-sr-assets
 */
function generateSessionReplayAssets() {
    const rootDir = process.cwd();
    const assetsPath = getAssetsPath();

    if (!assetsPath) {
        process.exit(0);
    }

    console.log(`Scanning for session replay assets in ${rootDir}...`);

    // Clear existing assets to ensure a fresh state
    clearAssetsDir(assetsPath);

    const files = glob.sync(['**/*.{js,jsx,ts,tsx}'], {
        cwd: rootDir,
        absolute: true,
        ignore: [
            '**/node_modules/**',
            '**/lib/**',
            '**/dist/**',
            '**/build/**',
            '**/*.d.ts',
            '**/*.test.*',
            '**/*.spec.*',
            '**/*.config.js',
            '**/__tests__/**',
            '**/__mocks__/**'
        ]
    });

    let errorCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
        try {
            const code = fs.readFileSync(file, 'utf8');

            // Transform the file using the Babel plugin with SVG tracking enabled
            transformSync(code, {
                filename: file,
                plugins: [
                    [
                        babelPlugin,
                        {
                            sessionReplay: {
                                svgTracking: true
                            }
                        }
                    ]
                ],
                presets: [
                    [
                        '@babel/preset-typescript',
                        { isTSX: true, allExtensions: true }
                    ],
                    '@babel/preset-react'
                ],
                // Don't generate actual output, we just want the asset generation
                code: false,
                ast: false
            });
        } catch (error) {
            errorCount++;
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            errors.push({ file, error: errorMessage });
        }
    }

    if (errorCount > 0) {
        console.warn(`${errorCount} files had errors`);
    }

    // Merge all individual SVG files into assets.bin and assets.json
    mergeSvgAssets(assetsPath);

    if (errorCount > 0) {
        console.log(
            'Asset generation finished, but some files encountered errors.'
        );
    }

    console.log('Your assets are now ready to be used by Session Replay.');
}

// TODO: Add flag support [e.g., --verbose] (RUM-12186)
generateSessionReplayAssets();
