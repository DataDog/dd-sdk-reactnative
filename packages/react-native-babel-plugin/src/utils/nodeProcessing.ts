/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import type { AssignmentNode, PluginPassState } from '../types';

export function insertAtProgramTop(
    path: Babel.NodePath<Babel.types.Program>,
    node: Babel.types.Statement | Babel.types.ModuleDeclaration
) {
    path.unshiftContainer('body', node);
}

export function getImportDeclaration(
    t: typeof Babel.types,
    data: string[],
    module: string
) {
    const nodeData = data.map(x =>
        t.importSpecifier(t.identifier(x), t.identifier(x))
    );
    return t.importDeclaration(nodeData, t.stringLiteral(module));
}

export function getFileInfo(data: Babel.PluginPass) {
    const result: { path: string | null; name: string | null } = {
        path: null,
        name: null
    };

    if (!data.filename) {
        return result;
    }

    const pathArray = data.filename.split('/');
    result.name = pathArray.slice(-1)[0];
    result.path = pathArray.slice(0, -1).join('/');

    return result;
}

export function getNodeName(
    t: typeof Babel.types,
    node: Babel.types.Node | string
): string | null {
    if (typeof node === 'string') {
        return node;
    }

    if (!('name' in node)) {
        return null;
    }

    if (typeof node.name === 'string') {
        return node.name;
    }

    if (t.isIdentifier(node.name) || t.isJSXIdentifier(node.name)) {
        return getNodeName(t, node.name);
    }

    if (t.isJSXNamespacedName(node.name)) {
        const member = node.name;
        return `${member.namespace.name}:${member.name.name}`;
    }

    if (t.isJSXMemberExpression(node.name)) {
        const member = node.name;

        if (t.isJSXIdentifier(member.object)) {
            return `${member.object.name}.${member.property.name}`;
        }

        let nodeName = member.property.name;
        let nodeTracker:
            | Babel.types.JSXIdentifier
            | Babel.types.JSXMemberExpression = member.object;

        if (t.isJSXMemberExpression(nodeTracker)) {
            while (t.isJSXMemberExpression(nodeTracker)) {
                nodeName = `${nodeTracker.property.name}.${nodeName}`;
                nodeTracker = nodeTracker.object;
            }

            if (t.isJSXIdentifier(nodeTracker)) {
                nodeName = `${nodeTracker.name}.${nodeName}`;
            }
        }

        return nodeName;
    }

    return null;
}

export function getAssignmentNode(
    t: typeof Babel.types,
    objectKey: string,
    propertyKey: string,
    value: AssignmentNode
) {
    const node = t.expressionStatement(
        t.assignmentExpression(
            '=',
            t.memberExpression(
                t.identifier(objectKey),
                t.identifier(propertyKey)
            ),
            value
        )
    );

    return node;
}

export function getArgumentsFromParams(
    t: typeof Babel.types,
    state: PluginPassState,
    params: (
        | Babel.types.Identifier
        | Babel.types.Pattern
        | Babel.types.RestElement
    )[]
) {
    const callArgs: (Babel.types.Expression | Babel.types.SpreadElement)[] = [];
    const preCallStatements: Babel.types.Statement[] = [];
    const wrapperParams: typeof params = [];

    for (const [index, param] of params.entries()) {
        // If it's a regular function param (ex:. handler(event){})
        if (t.isIdentifier(param)) {
            callArgs.push(param);
            wrapperParams.push(param);
        } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
            // If it's a function param with default value (ex:. handler(num = 1){})
            callArgs.push(param.left);
            wrapperParams.push(param);
        } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
            // If it's a function 'rest' param  (ex:. handler(event, ...rest){})
            callArgs.push(t.spreadElement(param.argument));
            wrapperParams.push(param);
        } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
            // If it's function 'destructured' param  (ex:. handler({ eventData }){})
            const synthetic = t.identifier(`_dd_arg${index}`);

            callArgs.push(synthetic);
            wrapperParams.push(synthetic);

            preCallStatements.push(
                t.variableDeclaration('const', [
                    t.variableDeclarator(param, synthetic)
                ])
            );
        } else {
            throw new Error(
                `Unsupported parameter type: ${param.type} on file: ${state.fileInfo?.path}/${state.fileInfo?.name}.`
            );
        }
    }

    return {
        callArgs,
        preCallStatements,
        wrapperParams
    };
}
