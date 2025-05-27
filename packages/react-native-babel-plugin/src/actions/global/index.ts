/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { PluginConstants } from '../../constants';
import type { BabelTypes } from '../../types';
import {
    getAssignmentNode,
    insertAtProgramTop,
    PluginState
} from '../../utils';

export function insertSetupFlag(
    path: Babel.NodePath<Babel.types.Program>,
    t: BabelTypes
) {
    const pluginState = PluginState.getInstance();
    // Only set the flag on the entry file of the project
    if (pluginState.isInitialized) {
        return;
    }

    pluginState.isInitialized = true;

    const flagNode = getAssignmentNode(
        t,
        'globalThis',
        PluginConstants.PLUGIN_ENABLED,
        t.booleanLiteral(true)
    );

    insertAtProgramTop(path, flagNode);
}
