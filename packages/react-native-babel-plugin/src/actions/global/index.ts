/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { RumAction, PluginConstants, tapElementsMap } from '../../constants';
import type { BabelTypes, PluginPassState, PluginOptions } from '../../types';
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
    pluginState: PluginPassState,
    options: PluginOptions
) {
    path.traverse({
        ImportDeclaration(p) {
            const specifiers = p.node.specifiers;
            const literal = p.node.source;

            if (literal.value !== 'react-native') {
                return;
            }

            if (!pluginState.trackedComponents) {
                pluginState.trackedComponents = {};
            }

            for (const specifier of specifiers) {
                if (!t.isImportSpecifier(specifier)) {
                    continue;
                }

                const importName = getNodeName(t, specifier.imported);
                const localName = getNodeName(t, specifier.local);

                const elementEvents = importName
                    ? tapElementsMap[importName]
                    : null;

                if (elementEvents && localName) {
                    pluginState.trackedComponents[localName] = {
                        useContent: options.components.useContent,
                        useNamePrefix: options.components.useNamePrefix,
                        handlers: elementEvents.map(event => ({
                            event,
                            action: RumAction.TAP // TODO: RUM-11584 change once we support more actions
                        }))
                    };
                }
            }
        }
    });
}
