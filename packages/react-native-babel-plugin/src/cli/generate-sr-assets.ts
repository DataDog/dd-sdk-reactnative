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
import { ReactNativeSVG } from '../libraries/react-native-svg';

type SvgIndexEntry = {
    offset: number;
    length: number;
};

type SvgIndex = Record<string, SvgIndexEntry>;

export type CliOptions = {
    ignore: string[];
    verbose: boolean;
    path: string | null;
    followSymlinks: boolean;
};

export const DEFAULT_IGNORE_PATTERNS = [
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
];

/**
 * Parses command line arguments for the generate-sr-assets CLI.
 *
 * Supported arguments:
 *   --ignore <pattern>    Additional glob patterns to ignore (can be specified multiple times)
 *   --verbose, -v         Enable verbose output for debugging
 *   --path, -p <path>     Path to the root directory to scan (defaults to current working directory)
 *   --followSymlinks      Follow symbolic links during traversal (default: false)
 *   --help, -h            Show help message
 *
 * @param args - Optional array of arguments (defaults to process.argv.slice(2))
 * @returns Parsed CLI options
 */
export function parseCliArgs(args?: string[]): CliOptions {
    const argv = args ?? process.argv.slice(2);
    const options: CliOptions = {
        ignore: [],
        verbose: false,
        path: null,
        followSymlinks: false
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else if (arg === '--ignore' || arg === '-i') {
            const value = argv[++i];
            if (value && !value.startsWith('-')) {
                options.ignore.push(value);
            } else {
                console.warn(
                    'Warning: --ignore flag requires a pattern argument'
                );
                i--; // Reprocess this arg if it's another flag
            }
        } else if (arg === '--verbose' || arg === '-v') {
            options.verbose = true;
        } else if (arg === '--path' || arg === '-p') {
            const value = argv[++i];
            if (value && !value.startsWith('-')) {
                options.path = value;
            } else {
                console.warn('Warning: --path flag requires a directory path');
                i--; // Reprocess this arg if it's another flag
            }
        } else if (arg === '--followSymlinks') {
            options.followSymlinks = true;
        }
    }

    return options;
}

/**
 * Prints the help message for the CLI.
 */
function printHelp(): void {
    console.info(`
Usage: npx datadog-generate-sr-assets [options]

Pre-generate SVG assets for Datadog Session Replay.

Options:
  --ignore, -i <pattern>  Additional glob patterns to ignore during scanning.
                          Can be specified multiple times.
                          Example: --ignore "**/legacy/**"
  --path, -p <path>       Path to the root directory to scan.
                          Defaults to the current working directory.
  --verbose, -v           Enable verbose output for debugging.
  --followSymlinks        Follow symbolic links during directory traversal.
                          Default: false (symlinks are ignored).
  --help, -h              Show this help message.

Examples:
  npx datadog-generate-sr-assets
  npx datadog-generate-sr-assets --path ./src
  npx datadog-generate-sr-assets --ignore "**/legacy/**" --verbose
  npx datadog-generate-sr-assets -p ./src -i "**/old/**" -v
`);
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
 *   npx @datadog/mobile-react-native-babel-plugin generate-sr-assets [options]
 *   or
 *   npx datadog-generate-sr-assets [options]
 *
 * Options:
 *   --ignore, -i pattern  Additional glob patterns to ignore during scanning.
 *                         Can be specified multiple times.
 *                         Example: --ignore "**\/legacy\/**" --ignore "**\/vendor\/**"
 *   --verbose, -v         Enable verbose output for debugging.
 *   --path, -p path       Path to the root directory to scan.
 *                         Defaults to the current working directory.
 *                         Example: --path ./src
 *   --followSymlinks      Follow symbolic links during directory traversal.
 *                         Default: false (symlinks are ignored).
 */
function generateSessionReplayAssets() {
    const cliOptions = parseCliArgs();
    const { verbose } = cliOptions;

    // Resolve the root directory from --path flag or default to cwd
    const rootDir = cliOptions.path
        ? path.resolve(process.cwd(), cliOptions.path)
        : process.cwd();

    // Validate the path exists
    if (cliOptions.path && !fs.existsSync(rootDir)) {
        console.error(`Error: Path does not exist: ${rootDir}`);
        process.exit(1);
    }

    if (cliOptions.path && !fs.statSync(rootDir).isDirectory()) {
        console.error(`Error: Path is not a directory: ${rootDir}`);
        process.exit(1);
    }

    const assetsPath = getAssetsPath();

    const startTime = Date.now();

    if (!assetsPath) {
        if (verbose) {
            console.info(
                '[verbose] No assets path found. Session Replay module may not be installed.'
            );
        }
        process.exit(0);
    }

    console.info(`Scanning for session replay assets in ${rootDir}...`);

    if (verbose) {
        console.info(`[verbose] Assets output path: ${assetsPath}`);
    }

    // Clear existing assets to ensure a fresh state
    clearAssetsDir(assetsPath);

    // Merge default ignore patterns with user-provided ones
    // Convert simple folder names to glob patterns (e.g., "legacy" → "**/legacy/**")
    const userIgnorePatterns = cliOptions.ignore.map(pattern => {
        // If it looks like a glob pattern, use as-is
        if (pattern.includes('*') || pattern.includes('?')) {
            return pattern;
        }
        // Otherwise, treat it as a folder name and convert to glob pattern
        return `**/${pattern}/**`;
    });
    const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...userIgnorePatterns];

    if (verbose) {
        console.info(`[verbose] Follow symlinks: ${cliOptions.followSymlinks}`);
        console.info('[verbose] Ignore patterns:');
        ignorePatterns.forEach(pattern => console.info(`  - ${pattern}`));
    }

    const files = glob.sync(['**/*.{js,jsx,ts,tsx}'], {
        cwd: rootDir,
        absolute: true,
        ignore: ignorePatterns,
        followSymbolicLinks: cliOptions.followSymlinks
    });

    if (verbose) {
        console.info(`[verbose] Found ${files.length} files to scan`);
    }

    let errorCount = 0;
    let processedCount = 0;
    const errors: Array<{ file: string; error: string }> = [];

    const reactNativeSVG = new ReactNativeSVG(rootDir, assetsPath, true);

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
                            },
                            __internal_saveSvgMapToDisk: true,
                            __internal_reactNativeSVG: reactNativeSVG
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

            processedCount++;
        } catch (error) {
            errorCount++;
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            errors.push({ file, error: errorMessage });

            if (verbose) {
                const relativePath = path.relative(rootDir, file);
                console.warn(`[verbose] Error processing ${relativePath}:`);
                console.warn(`  ${errorMessage}`);
            }
        }
    }

    if (errorCount > 0) {
        console.warn(`${errorCount} files had errors`);
    }

    // Merge all individual SVG files into assets.bin and assets.json
    mergeSvgAssets(assetsPath);

    const duration = Date.now() - startTime;

    if (verbose) {
        console.info('\n[verbose] Summary:');
        console.info(`  Files scanned: ${files.length}`);
        console.info(`  Files processed successfully: ${processedCount}`);
        console.info(`  Files with errors: ${errorCount}`);
        console.info(`  Duration: ${duration}ms`);

        if (errors.length > 0 && errors.length <= 10) {
            console.info('\n[verbose] Files with errors:');
            errors.forEach(({ file }) => {
                const relativePath = path.relative(rootDir, file);
                console.info(`  - ${relativePath}`);
            });
        } else if (errors.length > 10) {
            console.info(
                `\n[verbose] ${errors.length} files had errors (showing first 10):`
            );
            errors.slice(0, 10).forEach(({ file }) => {
                const relativePath = path.relative(rootDir, file);
                console.info(`  - ${relativePath}`);
            });
        }
    }

    if (errorCount > 0) {
        console.info(
            'Asset generation finished, but some files encountered errors.'
        );
    }

    console.info('Your assets are now ready to be used by Session Replay.');
}

// Only run when executed directly (not when imported for testing)
if (require.main === module) {
    generateSessionReplayAssets();
}
