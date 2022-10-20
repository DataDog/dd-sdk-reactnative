/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const getJsxRuntime = () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const [major, minor] = require('react/package.json').version.split('.');
    // We need to check on the version of React before calling require('react/jsx-runtime') as
    // it might crash other exports if the export does not exist (even if there is a try/catch).
    // See: https://github.com/facebook/metro/issues/836
    if (!isJsxExportedInReactVersion(major, minor)) {
        throw new Error('React version does not support new jsx transform');
    }

    // React Native does some premature optimizations if the require target is a static string, by making
    // it dynamic we prevent RN from trying to resolve react/jsx-runtime before the function is called
    const jsxRuntimePackage = isJsxExportedInReactVersion(major, minor)
        ? 'react/jsx-runtime'
        : 'react';

    // We have to use inline require here because older React versions (below 17) don't have jsx-runtime
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires, import/no-dynamic-require
    const jsxRuntime = require(jsxRuntimePackage);
    if (!jsxRuntime.jsx) {
        throw new Error('React version does not support new jsx transform');
    }
    return jsxRuntime.jsx;
};

/**
 * JSX Transform is available for React 16.14.0 (last React 16 version) and above
 */
const isJsxExportedInReactVersion = (major: string, minor: string): boolean => {
    if (Number(major) > 16) {
        return true;
    }
    if (Number(major) === 16 && Number(minor) > 13) {
        return true;
    }
    return false;
};
