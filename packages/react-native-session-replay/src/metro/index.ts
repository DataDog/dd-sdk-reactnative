/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

import { mergeSvgAssets } from './processing';
import { debounce } from './utils';

let watcher: ReturnType<typeof chokidar.watch> | null = null;

const MERGE_DEBOUNCE_MS = 300;
const WATCH_STABILITY_THRESHOLD_MS = 200;
const WATCH_POLL_INTERVAL_MS = 50;

export function withSessionReplayAssetBundler(metroConfig: any): any {
    const originalReporter = metroConfig.reporter;

    const assetsDir = path.resolve(__dirname, '../../../assets');

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    const debounceMerge = debounce(() => {
        try {
            mergeSvgAssets(assetsDir);
        } catch (error) {
            console.warn(
                '[SessionReplayAssetBundler] SVGs merge failed:',
                error
            );
        }
    }, MERGE_DEBOUNCE_MS);

    // Prevent potential multiple watchers if metro loads the config multiple times
    if (!watcher) {
        watcher = chokidar
            .watch(assetsDir, {
                // Skip events for files that already exist
                ignoreInitial: true,
                depth: 0,
                awaitWriteFinish: {
                    // Wait 200ms after last change
                    stabilityThreshold: WATCH_STABILITY_THRESHOLD_MS,
                    // Check every 50ms
                    pollInterval: WATCH_POLL_INTERVAL_MS
                }
            })
            .on('add', file => {
                if (!file.endsWith('.svg')) {
                    return;
                }

                debounceMerge();
            });
    }

    return {
        ...metroConfig,
        reporter: {
            update(event: any) {
                if (originalReporter?.update) {
                    originalReporter.update(event);
                }

                // https://github.com/facebook/metro/blob/main/packages/metro/src/lib/reporting.js
                if (
                    event.type === 'bundle_build_done' ||
                    event.type === 'transformer_load_done'
                ) {
                    mergeSvgAssets(assetsDir);

                    // Close the file watcher after bundling completes
                    // This prevents the chokidar watcher from keeping the
                    // Node process alive during release/CI builds
                    if (watcher) {
                        watcher.close();
                        watcher = null;
                    }
                }
            }
        }
    };
}
