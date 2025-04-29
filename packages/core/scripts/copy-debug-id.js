#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { argv, exit } = require('process');

const [, , packagerPath, composedPath] = argv;

const TAG = '[@datadog/mobile-react-native]';

const warn = message => {
    console.warn(`${TAG} ${message}`);
};

const error = (message, fatal = true) => {
    warn(message);
    if (fatal) {
        exit(1);
    }
};

const safeLoad = path => {
    if (!path || !existsSync(path)) {
        error(`Debug ID copy failed: Missing or invalid file at ${path}`);
    }
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch {
        error(`Debug ID copy failed: Cannot parse JSON at ${path}`);
    }
};

const packagerMap = safeLoad(packagerPath);
const composedMap = safeLoad(composedPath);

if (!packagerMap?.debugId) {
    error('No debugId found in packager sourcemap.');
}

if (composedMap?.debugId) {
    error('Composed sourcemap already contains a debugId.');
}

composedMap.debugId = packagerMap.debugId;

try {
    writeFileSync(composedPath, JSON.stringify(composedMap, null, 2));
    console.log(`${TAG} Debug ID successfully copied.`);
} catch {
    error('Debug ID copy failed: Cannot write updated composed sourcemap.');
}
