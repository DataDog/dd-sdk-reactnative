/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import {
    arrowFunctionExpression,
    blockStatement,
    jsxAttribute,
    jsxExpressionContainer,
    jsxIdentifier
} from '@babel/types';

import {
    RumActionConstants,
    rumComponentAttributes,
    tapElementsRequiredAttributesMap
} from '../../constants';
import type {
    PluginPassState,
    PluginOptions,
    RumActionResult
} from '../../types';
import {
    getImportDeclaration,
    getNodeName,
    insertAtProgramTop
} from '../../utils';

import { handleTapAction } from './tap';

export function insertRumActionImport(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.Program>
) {
    // TODO: make sure this is only included if the configuration object is set
    const importNode = getImportDeclaration(
        t,
        [
            RumActionConstants.ACTION_CLASS,
            RumActionConstants.UTILS_FUNCTION_EXTRACT_TEXT
        ],
        RumActionConstants.IMPORT_PACKAGE
    );
    insertAtProgramTop(path, importNode);
}

export function handleJSXElementActionPaths(
    componentName: string,
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXElement>,
    state: PluginPassState,
    options: PluginOptions
) {
    if (path.node?.extra?.__wrappedForRum) {
        return;
    }
    const {
        actionPathList,
        actionPathNames,
        ddValues
    } = getJSXElementActionPaths(componentName, t, path, state, options);

    console.log('path.node.extra: ', path.node.extra);

    const componentNameList = state.trackedComponents
        ? Object.keys(state.trackedComponents)
        : [];

    ensureMandatoryAttributes(
        path,
        componentName,
        actionPathList,
        actionPathNames
    );

    const clone = t.cloneNode(path.node, true);
    clone.extra = {
        __wrappedForRum: true
    };

    const getContentNode = t.arrowFunctionExpression(
        [],
        t.blockStatement([
            t.returnStatement(
                t.callExpression(t.identifier('__ddExtractText'), [clone])
            )
        ])
    );

    ddValues.getContent = getContentNode;

    for (const attrPath of actionPathList) {
        attrPath.node.extra = {
            ...attrPath.node.extra,
            ddValues
        };

        console.log('attrPath.node.extra: ', attrPath.node.extra);

        handleRumActions(t, attrPath, state, componentNameList);
    }
}

export function ensureMandatoryAttributes(
    path: Babel.NodePath<Babel.types.JSXElement>,
    componentName: string,
    actionPathList: Babel.NodePath<Babel.types.JSXAttribute>[],
    actionPathNames: string[]
) {
    // Check if we're missing some required attributes
    const requiredAttributes = tapElementsRequiredAttributesMap[componentName];
    if (requiredAttributes) {
        const attrToAdd = requiredAttributes.filter(
            x => !actionPathNames.includes(x)
        );

        for (const attr of attrToAdd) {
            const attribute = jsxAttribute(
                jsxIdentifier(attr),
                jsxExpressionContainer(
                    arrowFunctionExpression([], blockStatement([]))
                )
            );
            path.node.openingElement.attributes.push(attribute);

            const attrPaths = path.get(
                'openingElement.attributes'
            ) as Babel.NodePath<Babel.types.JSXAttribute>[];

            const lastPath = attrPaths[attrPaths.length - 1];

            actionPathList.push(lastPath);
        }
    }
}

export function getJSXElementActionPaths(
    componentName: string,
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXElement>,
    state: PluginPassState,
    options: PluginOptions
) {
    const ddAttrs = [
        ...rumComponentAttributes,
        options.actionNameAttribute ?? null
    ].filter(Boolean);

    const ddValues: Record<
        string,
        string | Babel.types.ArrowFunctionExpression
    > = {};
    const actionMapList =
        state.trackedComponents?.[componentName]?.handlers.map(x => x.event) ||
        [];

    const actionPathList: Babel.NodePath<Babel.types.JSXAttribute>[] = [];
    const actionPathNames: string[] = [];

    path.traverse({
        JSXAttribute(subpath) {
            if (!subpath.node.extra) {
                subpath.node.extra = {};
            }

            const attrName = getNodeName(t, subpath.node.name);
            if (!attrName) {
                return;
            }

            const isValidAttr = ddAttrs.includes(attrName);

            if (isValidAttr) {
                const data = subpath.node.value;

                if (t.isStringLiteral(data)) {
                    ddValues[attrName] = data.value;
                }

                return;
            }

            const isValidMapping = actionMapList.includes(attrName);

            if (isValidMapping) {
                actionPathNames.push(attrName);
                actionPathList.push(subpath);
                return;
            }
        }
    });

    return { actionPathList, actionPathNames, ddValues };
}

export function handleRumActions(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    state: PluginPassState,
    componentNameList: string[]
) {
    // If the node was already processed skip the processing step
    // When using `path.traverse` inside the `JSXElement` hook and injecting new nodes
    // We can get into a situation where the same attribute is set to be processed twice due to parent lookup operations
    // TODO: is this needed here or is the upper level one enough ?
    if (path.node?.extra?.__wrappedForRum) {
        return;
    }

    const validParent = checkValidParent(t, path, componentNameList);
    if (!validParent) {
        return;
    }

    const { success, result } = checkValidAction(t, path);
    if (!success || !result) {
        return;
    }

    const containerExpression = handleTapAction(path, t, state, result);

    if (!containerExpression) {
        return;
    }

    path.node.value = containerExpression;
    path.node.extra = {
        ...path.node.extra,
        __wrappedForRum: true
    };
}

/*
 * Checks if the element in question is inside a custom element tracked from plugin configuration
 * If so, skip wrapping DD logic to prevent duplicate actions
 */
function checkValidParent(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    componentNameList: string[]
) {
    const predicate = (p: Babel.NodePath<Babel.types.Node>) =>
        p.isFunctionDeclaration() ||
        p.isVariableDeclaration() ||
        p.isClassDeclaration();

    const cPath = path.findParent(p => predicate(p)) || null;

    if (cPath) {
        const node = cPath.node;
        let parentName: string | null = null;

        if (t.isVariableDeclaration(node)) {
            const cNode = node.declarations[0].id;
            parentName = getNodeName(t, cNode);
            return true;
        } else if (
            t.isFunctionDeclaration(node) ||
            t.isClassDeclaration(node)
        ) {
            const cNode = node.id;
            parentName = cNode ? getNodeName(t, cNode) : null;
        }

        if (parentName && componentNameList.includes(parentName)) {
            return false;
        }
    }

    return true;
}

function checkValidAction(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>
): { success: boolean; result: RumActionResult | null } {
    const parentNodePath = path.findParent(x =>
        t.isJSXOpeningElement(x.node)
    ) as typeof path;
    const parentNode = parentNodePath.node;
    const parentName = parentNode ? getNodeName(t, parentNode) : null;
    const propertyName = getNodeName(t, path.node);
    const propertyNode = path.node;
    const propertyValue = path.node.value;
    const expression =
        propertyValue && 'expression' in propertyValue
            ? propertyValue.expression
            : null;

    if (
        !parentNode ||
        !parentName ||
        !propertyName ||
        !propertyValue ||
        !expression
    ) {
        return { success: false, result: null };
    }

    return {
        success: true,
        result: {
            parentNode,
            parentName,
            propertyName,
            propertyNode,
            expression
        }
    };
}
