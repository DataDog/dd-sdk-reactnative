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
import type {
    PluginAPI,
    PluginOptions,
    PluginPassState,
    PluginResult
} from './types';
import { getFileInfo, getNodeName } from './utils/index';

export default declare(
    (
        api: PluginAPI,
        options: PluginOptions,
        _dirname: string
    ): PluginResult => {
        api.assertVersion(7);

        return {
            visitor: {
                Program: {
                    enter(path, state) {
                        const pluginState: PluginPassState = state;

                        if (!pluginState.trackedComponents) {
                            pluginState.trackedComponents = {};
                        }

                        for (const entry of options.components?.tracked ?? []) {
                            const importSource = entry.importSource ?? 'local';
                            pluginState.trackedComponents[entry.name] = {
                                ...(entry.type ? { type: entry.type } : {}),
                                handlers: entry.handlers,
                                importSource
                            };
                        }

                        const { path: p, name } = getFileInfo(this);

                        pluginState.fileInfo = { path: p, name };

                        insertSetupFlag(path, api.types);
                        loadImportMap(path, api.types, pluginState);
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
