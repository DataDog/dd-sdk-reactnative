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

        // TODO: find a better way to merge objects
        const options = {
            ...opt,
            components: {
                ...defaultPluginOptions.components,
                ...opt.components
            }
        };

        return {
            visitor: {
                Program: {
                    enter(path, state) {
                        const pluginState: PluginPassState = state;

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

                        const { path: p, name } = getFileInfo(this);

                        pluginState.fileInfo = { path: p, name };

                        insertSetupFlag(path, api.types);
                        loadImportMap(path, api.types, pluginState, options);
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
                }
            }
        };
    }
);
