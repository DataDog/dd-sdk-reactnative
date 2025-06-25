#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { argv, exit } = require('process');

const [, , packagerPath, composedPath] = argv;

const TAG = '[@datadog/mobile-react-native]';

const warnAndExit = message => {
    console.log(`\n${TAG} WARNING: ${message}\n`);
    exit(0);
};

const safeLoad = path => {
    if (!path || !existsSync(path)) {
        warnAndExit(`Debug ID copy failed: Missing or invalid file at ${path}`);
    }
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        warnAndExit(`Debug ID copy failed: Cannot parse JSON at ${path}`);
    }
};

const packagerMap = safeLoad(packagerPath);
const composedMap = safeLoad(composedPath);

if (!packagerMap?.debugId) {
    warnAndExit('No debugId found in packager sourcemap.');
}

if (composedMap?.debugId) {
    warnAndExit('Composed sourcemap already contains a debugId.');
}

composedMap.debugId = packagerMap.debugId;

try {
    writeFileSync(composedPath, JSON.stringify(composedMap, null, 2));
    console.log(`${TAG} Debug ID successfully copied.`);
} catch {
    warnAndExit(
        'Debug ID copy failed: Cannot write updated composed sourcemap.'
    );
}
