/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { PluginConstants, tapElementsMap } from '../../constants';
import type { BabelTypes, PluginPassState } from '../../types';
import {
    PluginState,
    getAssignmentNode,
    getNodeName,
    insertAtProgramTop
} from '../../utils';

export function insertSetupFlag(
    path: Babel.NodePath<Babel.types.Program>,
    state: PluginPassState,
    t: BabelTypes
) {
    const pluginState = PluginState.getInstance(state);

    // Only set the flag on the entry file of the project
    if (pluginState.isInitialized()) {
        return;
    }

    pluginState.initialize();

    const flagNode = getAssignmentNode(
        t,
        'globalThis',
        PluginConstants.PLUGIN_ENABLED,
        t.booleanLiteral(true)
    );

    insertAtProgramTop(path, flagNode);
}

export function loadImportMap(
    path: Babel.NodePath<Babel.types.Program>,
    t: BabelTypes,
    pluginState: PluginPassState
) {
    path.traverse({
        ImportDeclaration(p) {
            const specifiers = p.node.specifiers;
            const literal = p.node.source;

            if (literal.value !== 'react-native') {
                return;
            }

            const tapElementsImportMap: Record<string, string[]> = {};

            for (const specifier of specifiers) {
                if (!t.isImportSpecifier(specifier)) {
                    continue;
                }

                const importName = getNodeName(t, specifier.imported);
                const elementEvents = importName
                    ? tapElementsMap[importName]
                    : null;

                if (elementEvents) {
                    const importLocalName = getNodeName(t, specifier.local);

                    if (importLocalName) {
                        tapElementsImportMap[importLocalName] = elementEvents;
                    }
                }
            }

            pluginState.tapMappings = tapElementsImportMap;
        }
    });
}
