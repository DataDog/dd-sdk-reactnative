#!/usr/bin/env node

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * This script replaces the inline require of 'react' in src/rum/instrumentation/getJsxRuntime.ts
 * to 'react/jsx-runtime'.
 *
 * Context:
 * From its version 16.14, React adds the `jsx` function as a new way to create components. This replaces
 * the createElement function (which is still used in current versions in some cases).
 * From React 18, this seems to become the default. This is also used by default in Expo since Expo 45 at least.
 * On React versions below 16.14, trying to import 'react/jsx-runtime' would fail (see https://github.com/facebook/metro/issues/836)
 * and this failure then disables all imports (see first fix: https://github.com/DataDog/dd-sdk-reactnative/pull/310).
 * However, metro does not support inline requires (see https://github.com/DataDog/dd-sdk-reactnative/issues/353), so
 * we replace the import in this postinstall script.
 *
 * We choose to have 'react/jsx-runtime' as default in the code, that way we don't have to deal with this change in the source when we work on it.
 */

// We can only use requires in node
// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const { readFileSync, writeFileSync } = require('fs');

process.stdout.write('RUNNING');

const GET_JSX_RUNTIME_RELATIVE_PATH = 'rum/instrumentation/getJsxRuntime';

const isJsxExportedInReactVersion = (major, minor) => {
    if (Number(major) > 16) {
        return true;
    }
    if (Number(major) === 16 && Number(minor) > 13) {
        return true;
    }
    return false;
};

const replaceReactJsxRequire = () => {
    const datadogPath = `${__dirname}/..`;
    const locations = [
        { directory: `${datadogPath}/src`, extension: 'ts' },
        { directory: `${datadogPath}/lib/commonjs`, extension: 'js' },
        { directory: `${datadogPath}/lib/commonjs`, extension: 'js.map' },
        { directory: `${datadogPath}/lib/module`, extension: 'js' },
        { directory: `${datadogPath}/lib/module`, extension: 'js.map' }
    ];

    locations.forEach(location => {
        const fileLocation = `${location.directory}/${GET_JSX_RUNTIME_RELATIVE_PATH}.${location.extension}`;
        const file = readFileSync(fileLocation).toString();
        writeFileSync(
            fileLocation,
            file.replace("require('react/jsx-runtime')", "require('react')")
        );
    });
};

try {
    // Get React version
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const [major, minor] = require('react/package.json').version.split('.');
    process.stdout.write(`${major}${minor}`);

    if (!isJsxExportedInReactVersion(major, minor)) {
        replaceReactJsxRequire();
    }
    console.warn('made it');
} catch (error) {
    // TODO: Improve error message
    console.warn(error);
    process.stderr.write('Error running @datadog');
}
