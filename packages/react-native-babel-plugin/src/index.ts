/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { declare } from '@babel/helper-plugin-utils';

import { insertSetupFlag, loadImportMap } from './actions/global';
import {
    handleJSXElementActionPaths,
    insertRumActionImport
} from './actions/rum';
import { defaultPluginOptions } from './constants';
import { getAssetsPath } from './libraries/react-native-svg/processing/fs';
import { ReactNativeSVG } from './libraries/react-native-svg';
import type {
    PluginAPI,
    PluginOptions,
    PluginPassState,
    PluginResult
} from './types';
import { getFileInfo, getNodeName } from './utils/index';

export default declare(
    (api: PluginAPI, opt: PluginOptions, _dirname: string): PluginResult => {
        api.assertVersion(7);

        const options = {
            ...opt,
            sessionReplay: {
                ...defaultPluginOptions.sessionReplay,
                ...opt.sessionReplay
            },
            components: {
                ...defaultPluginOptions.components,
                ...opt.components
            }
        };

        let reactNativeSVG: ReactNativeSVG | undefined;

        let assetsPath: string | null = null;

        return {
            pre() {
                if (!options.sessionReplay.svgTracking) {
                    return;
                }

                if (!assetsPath) {
                    assetsPath = getAssetsPath();
                }

                reactNativeSVG = options.__internal_reactNativeSVG;
                if (!reactNativeSVG && assetsPath) {
                    reactNativeSVG = new ReactNativeSVG(
                        process.cwd(),
                        assetsPath,
                        options.__internal_saveSvgMapToDisk || false
                    );
                    reactNativeSVG.setApiTypes(api.types);
                    reactNativeSVG.buildSvgMap();
                }
                reactNativeSVG?.setApiTypes(api.types);
            },
            visitor: {
                Program: {
                    enter(path, state) {
                        const pluginState: PluginPassState = state;

                        // Skip all transforms for web builds
                        const platform = (state.file?.opts?.caller as any)
                            ?.platform;
                        if (platform === 'web') {
                            return;
                        }

                        const { path: p, name } = getFileInfo(this);

                        if (p?.includes('node_modules')) {
                            return;
                        }

                        pluginState.fileInfo = { path: p, name };
                        pluginState.reactNativeSVG = reactNativeSVG;

                        insertSetupFlag(path, state, api.types);
                        loadImportMap(path, api.types, pluginState, options);

                        if (!pluginState.trackedComponents) {
                            pluginState.trackedComponents = {};
                        }

                        for (const entry of options.components.tracked) {
                            pluginState.trackedComponents[entry.name] = {
                                useContent:
                                    entry.useContent !== undefined
                                        ? entry.useContent
                                        : options.components.useContent,
                                useNamePrefix:
                                    entry.useNamePrefix !== undefined
                                        ? entry.useNamePrefix
                                        : options.components.useNamePrefix,
                                ...(entry.contentProp
                                    ? { contentProp: entry.contentProp }
                                    : {}),
                                handlers: entry.handlers
                            };
                        }
                    },
                    exit(path, state) {
                        const pluginState: PluginPassState = state;
                        const t = api.types;

                        if (pluginState.hasValidTapAction) {
                            insertRumActionImport(t, path);
                        }
                    }
                },
                JSXElement(path, state) {
                    const t = api.types;
                    const pluginState: PluginPassState = state;
                    const name = getNodeName(t, path.node.openingElement);

                    const { path: p } = getFileInfo(this);

                    if (p?.includes('node_modules')) {
                        return;
                    }

                    if (!name) {
                        return;
                    }

                    handleJSXElementActionPaths(
                        name,
                        t,
                        path,
                        pluginState,
                        options
                    );

                    pluginState.reactNativeSVG?.processItem(path, name);
                }
            }
        };
    }
);

module.exports = exports.default;
