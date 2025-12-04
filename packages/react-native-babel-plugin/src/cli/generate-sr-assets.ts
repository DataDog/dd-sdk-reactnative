#!/usr/bin/env node
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transformSync } from '@babel/core';
import glob from 'fast-glob';
import fs from 'fs';
import os from 'os';
import path from 'path';

import babelPlugin from '../index';
import {
    clearAssetsDir,
    getAssetsPath
} from '../libraries/react-native-svg/processing/fs';
import { ReactNativeSVG } from '../libraries/react-native-svg';
import type { LocalSvgMap } from '../types';

type SvgIndexEntry = {
    offset: number;
    length: number;
};

type SvgIndex = Record<string, SvgIndexEntry>;

// Patterns that indicate a file might contain SVG usage
const SVG_INDICATORS = [
    /\.svg['"`]/i, // SVG file imports
    /<Svg[\s>]/i, // react-native-svg Svg component
    /from\s+['"]react-native-svg['"]/i, // react-native-svg import
    /import.*['"].*\.svg['"`]/i // SVG import statement
];

/**
 * Quick check if a file might contain SVG-related code.
 * This is a fast heuristic to skip files that definitely don't have SVGs.
 */
function mightContainSvg(code: string): boolean {
    return SVG_INDICATORS.some(pattern => pattern.test(code));
}

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
            console.info(
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
 * Process a single file through the Babel plugin.
 * Returns true if processing was successful, false otherwise.
 */
function processFile(
    file: string,
    pluginConfig: [any, any],
    presets: any[]
): { success: boolean; error?: string } {
    try {
        const code = fs.readFileSync(file, 'utf8');

        // Early exit: skip files that don't contain SVG-related code
        if (!mightContainSvg(code)) {
            return { success: true };
        }

        // Transform the file using the Babel plugin with SVG tracking enabled
        transformSync(code, {
            filename: file,
            plugins: [pluginConfig], // Reuse the same plugin config
            presets,
            // Don't generate actual output, we just want the asset generation
            code: false,
            ast: false
        });

        return { success: true };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Process files in batches to balance memory usage and parallelism.
 * Uses Promise.all for concurrent processing within each batch.
 */
async function processFilesInBatches(
    files: string[],
    pluginConfig: [any, any],
    presets: any[],
    batchSize: number,
    onProgress?: (processed: number, total: number) => void
): Promise<{ errorCount: number }> {
    let errorCount = 0;
    let processed = 0;

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);

        // Process batch concurrently using Promise.all
        // eslint-disable-next-line no-await-in-loop -- Intentional: process batches sequentially for memory control and progress reporting
        const results = await Promise.all(
            batch.map(async file => {
                // Use setImmediate to allow event loop to process other tasks
                await new Promise(resolve => setImmediate(resolve));
                return {
                    file,
                    result: processFile(file, pluginConfig, presets)
                };
            })
        );

        // Count errors
        for (const { result } of results) {
            if (!result.success) {
                errorCount++;
            }
        }

        processed += batch.length;
        onProgress?.(processed, files.length);
    }

    return { errorCount };
}

/**
 * Display a progress bar in the terminal.
 */
function showProgress(current: number, total: number, startTime: number): void {
    const percent = Math.round((current / total) * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = current / elapsed;
    const eta = rate > 0 ? Math.round((total - current) / rate) : 0;

    const barWidth = 30;
    const filled = Math.round((current / total) * barWidth);
    const empty = barWidth - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    process.stdout.write(
        `\r[${bar}] ${percent}% (${current}/${total}) - ETA: ${eta}s`
    );

    if (current === total) {
        process.stdout.write('\n');
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
 * Optimizations applied:
 * - SVG map is built once before processing (not per-file)
 * - Plugin config is created once and reused (enables Babel cache hits)
 * - Files are filtered early if they don't contain SVG patterns
 * - Batch processing for better throughput
 * - Progress reporting for visibility
 *
 * Usage:
 *   npx @datadog/mobile-react-native-babel-plugin generate-sr-assets
 *   or
 *   npx datadog-generate-sr-assets
 */
async function generateSessionReplayAssets() {
    const rootDir = process.cwd();
    const assetsPath = getAssetsPath();

    if (!assetsPath) {
        process.exit(0);
    }

    const totalStartTime = Date.now();

    console.info(`\n🔍 Scanning for session replay assets in ${rootDir}...\n`);

    // Clear existing assets to ensure a fresh state
    clearAssetsDir(assetsPath);

    // Step 1: Build SVG map ONCE (this was the O(N²) bottleneck)
    console.info('📦 Building SVG import map...');
    const svgMapStartTime = Date.now();
    const prebuiltSvgMap: LocalSvgMap = ReactNativeSVG.buildSvgMapFromDirectory(
        rootDir
    );
    const svgMapTime = ((Date.now() - svgMapStartTime) / 1000).toFixed(2);
    const svgCount = Object.keys(prebuiltSvgMap).length;
    console.info(`   Found ${svgCount} SVG imports in ${svgMapTime}s\n`);

    // Step 2: Scan for source files
    console.info('📂 Scanning source files...');
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

    console.info(`   Found ${files.length} source files\n`);

    if (files.length === 0) {
        console.info('No source files found to process.');
        return;
    }

    // Step 3: Create plugin config once (reused across all files for cache hits)
    const pluginConfig: [any, any] = [
        babelPlugin,
        {
            sessionReplay: {
                svgTracking: true
            },
            __internal_saveSvgMapToDisk: true,
            __internal_prebuiltSvgMap: prebuiltSvgMap
        }
    ];

    const presets = [
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        '@babel/preset-react'
    ];

    // Step 4: Process files in batches
    // Use batch size based on available CPUs
    const cpuCount = os.cpus().length;
    const batchSize = Math.max(cpuCount * 2, 16);

    console.info(`⚙️  Processing files (batch size: ${batchSize})...`);
    const processStartTime = Date.now();

    const { errorCount } = await processFilesInBatches(
        files,
        pluginConfig,
        presets,
        batchSize,
        (processed, total) => showProgress(processed, total, processStartTime)
    );

    const processTime = ((Date.now() - processStartTime) / 1000).toFixed(2);
    console.info(`   Processed ${files.length} files in ${processTime}s\n`);

    if (errorCount > 0) {
        console.warn(`⚠️  ${errorCount} files had errors`);
    }

    // Step 5: Merge all individual SVG files into assets.bin and assets.json
    console.info('📦 Merging SVG assets...');
    mergeSvgAssets(assetsPath);

    const totalTime = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    console.info(`\n✅ Asset generation completed in ${totalTime}s`);

    if (errorCount > 0) {
        console.info(
            '   Some files encountered errors (this is usually fine for non-React files).'
        );
    }

    console.info(
        '   Your assets are now ready to be used by Session Replay.\n'
    );
}

// TODO: Add flag support [e.g., --verbose] (RUM-12186)
generateSessionReplayAssets().catch(err => {
    console.error('Fatal error during asset generation:', err);
    process.exit(1);
});
