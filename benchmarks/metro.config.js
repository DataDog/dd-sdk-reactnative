const path = require('path');
const pakCore = require('../packages/core/package.json');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const escape = require('escape-string-regexp');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const modules = Object.keys({
    ...pakCore.peerDependencies
});

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
    projectRoot: __dirname,
    watchFolders: [
        root
    ],
    resetCache: true,
    // Route .svg files through react-native-svg-transformer so they are importable
    // as React components (used by Session Replay SVG file-import test cases).
    transformer: {
        babelTransformerPath: require.resolve('react-native-svg-transformer')
    },
    // We need to make sure that only one version is loaded for peerDependencies
    // So we denylist them at the root, and alias them to the versions in example's node_modules
    // This block is very important, because otherwise things like React can be packed multiple times
    // while it should be only one React instance in the runtime. exclusionList relies on the modules which are
    // declared as peer dependencies in the core package.
    resolver: {
        // Remove svg from asset extensions and add it to source extensions so Metro
        // sends it through the transformer rather than copying it as a static asset.
        assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
        sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],

        blacklistRE: exclusionList(
            modules.map(
                m =>
                    new RegExp(
                        `^${escape(path.join(root, 'node_modules', m))}\\/.*$`
                    )
            )
        ),
        extraNodeModules: {
            ...modules.reduce((acc, name) => {
                acc[name] = path.join(__dirname, 'node_modules', name);
                return acc;
            }, {}),
            // H4: alias configured directly in metro.config.js (rather than
            // babel-plugin-module-resolver/tsconfig.json), exercising
            // buildSvgMap's resolver.extraNodeModules alias path. Unscoped
            // (no leading '@') so it matches for any subpath depth -- Metro's
            // own parsing only splits a scoped key at a *second* slash, so
            // e.g. '@metroAssets/star.svg' wouldn't match a key of just
            // '@metroAssets' (see pathAliasResolver.ts).
            //
            // Points into @react-native/debugger-frontend (a real npm
            // dependency, not a workspace symlink) for the same reason as
            // the babel-plugin-module-resolver aliases above -- see
            // babel.config.js.
            metroAssets: path.join(
                __dirname,
                'node_modules/@react-native/debugger-frontend/dist/third-party/front_end/Images'
            )
        }
    },
};

module.exports = mergeConfig(defaultConfig, config);
