/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '..');
const keplerRoot = path.join(packageRoot, 'dist', 'kepler');
const manifestPath = path.join(keplerRoot, 'tm-manifest.json');
const requiredArchitectures = ['aarch64', 'armv7', 'x86_64'];
const requiredBuildTypes = ['Release', 'Debug'];

if (!fs.existsSync(manifestPath)) {
    throw new Error(
        'Missing dist/kepler/tm-manifest.json. Run `vega build -b Release` and `vega build -b Debug` before packing.'
    );
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const nativeFileSets = manifest.fileSets?.native ?? [];

for (const buildType of requiredBuildTypes) {
    for (const architecture of requiredArchitectures) {
        const fileSet = nativeFileSets.find(
            entry =>
                entry.arch === architecture &&
                entry.variant === buildType.toLowerCase()
        );
        const libraryPath = fileSet
            ? path.join(
                  keplerRoot,
                  fileSet.directoryPath,
                  'lib',
                  'libDatadogVega.so'
              )
            : '';

        if (!fileSet || !fs.existsSync(libraryPath)) {
            throw new Error(
                `Missing ${architecture} ${buildType} library. Run \`vega build -b ${buildType}\` before packing.`
            );
        }
    }
}
