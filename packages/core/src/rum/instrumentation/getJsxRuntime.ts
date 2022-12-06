/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const getJsxRuntime = () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const [major, minor] = require('react/package.json').version.split('.');
    // We need to check on the version of React before requiring 'react/jsx-runtime') as
    // it might crash other exports if the export does not exist (even if there is a try/catch).
    // See: https://github.com/facebook/metro/issues/836
    if (!isJsxExportedInReactVersion(major, minor)) {
        throw new Error('React version does not support new jsx transform');
    }

    // /!\/!\/!\/!\/!\/!\
    // We have to use inline require here because older React versions (below 16.14) don't have jsx-runtime.
    // metro does not support dynamic require, so 'react/jsx-runtime' is replaced by 'react' on postinstall
    // when react is equal or above 16.14 to avoid this require call to fail during the import phase and then
    // disable all further imports.
    // /!\/!\/!\/!\/!\/!\
    //
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const jsxRuntime = require('react/jsx-runtime');
    if (!jsxRuntime.jsx) {
        throw new Error('React version does not support new jsx transform');
    }
    return jsxRuntime;
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
