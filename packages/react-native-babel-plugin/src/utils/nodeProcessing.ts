/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import type { AssignmentNode, PluginPassState } from '../types';

/**
 * Inserts a node at the very top of a Program body.
 *
 * @param path - Program path to mutate.
 * @param node - Statement or module declaration to unshift into `body`.
 */
export function insertAtProgramTop(
    path: Babel.NodePath<Babel.types.Program>,
    node: Babel.types.Statement | Babel.types.ModuleDeclaration
) {
    path.unshiftContainer('body', node);
}

/**
 * Creates a named import declaration for a given module.
 *
 * Given: `getImportDeclaration(t, ['foo', 'bar'], 'pkg')`
 * Results: `import { foo, bar } from 'pkg';`
 *
 * @param t - Babel types helper.
 * @param data - List of named specifiers to import.
 * @param module - Module source string.
 * @returns `ImportDeclaration` AST node.
 */
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

/**
 * Extracts filename and directory from Babel's PluginPass.
 *
 * @param data - Babel plugin pass object.
 * @returns Object with the file `path` (directory) and `name` (basename). Nulls if unavailable.
 */
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

/**
 * Resolves a readable name for various identifier-like nodes.
 *
 * Supports: Identifier, JSXIdentifier, JSXNamespacedName, JSXMemberExpression,
 * as well as a plain string.
 *
 * @param t - Babel types helper.
 * @param node - Node or string to resolve.
 * @returns The resolved name or `null` if not applicable.
 */
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

/**
 * Builds an assignment expression statement: `objectKey.propertyKey = value`.
 *
 * @param t - Babel types helper.
 * @param objectKey - Identifier name for the left-hand object.
 * @param propertyKey - Identifier name for the left-hand property.
 * @param value - Right-hand expression/value to assign.
 * @returns `ExpressionStatement` with an `AssignmentExpression`.
 */
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

/**
 * Gets wrapper-call argument wiring from original function parameters.
 *
 * Returns:
 *  - `callArgs`: expressions to pass when invoking the original function,
 *  - `preCallStatements`: statements (e.g., destructuring temps) to run before invocation,
 *  - `wrapperParams`: parameters for the wrapper arrow function.
 *
 * Supports identifiers, default params, rest elements, and destructured patterns.
 *
 * @param t - Babel types helper.
 * @param state - Plugin state (used for error context).
 * @param params - Original function parameters.
 * @returns `{ callArgs, preCallStatements, wrapperParams }`.
 * @throws If a parameter type is unsupported.
 */
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

/**
 * Converts a variety of JS values or AST nodes to a valid `Expression`.
 *
 * Rules:
 *  - primitives → literal expressions,
 *  - existing `Expression` → returned as-is,
 *  - `SpreadElement` → wrapped into a single-element array expression,
 *  - arrays of nodes → array expression (non-expressions become `undefined` identifiers),
 *  - fallback → `null`.
 *
 * @param t - Babel types helper.
 * @param v - Value or node to convert.
 * @returns `Expression` node.
 */
export function toExpression(
    t: typeof Babel.types,
    v: unknown
): Babel.types.Expression {
    if (typeof v === 'string') {
        return t.stringLiteral(v);
    }

    if (typeof v === 'boolean') {
        return t.booleanLiteral(v);
    }

    if (typeof v === 'number') {
        return t.numericLiteral(v);
    }

    if (t.isExpression(v as any)) {
        return v as Babel.types.Expression;
    }

    if (t.isSpreadElement?.(v as any)) {
        // Spreads can’t be used as a property value; wrap them in an array
        return t.arrayExpression([v as Babel.types.SpreadElement]);
    }

    if (Array.isArray(v)) {
        const nodes = v as Babel.types.Node[];
        const elements: Babel.types.Expression[] = [];

        for (const n of nodes) {
            if (t.isExpression(n as any)) {
                elements.push(n as Babel.types.Expression);
            } else if (t.isSpreadElement?.(n as any)) {
                elements.push(
                    t.arrayExpression([n as Babel.types.SpreadElement])
                );
            } else {
                // Unexpected entries we may try to push
                elements.push(t.identifier('undefined'));
            }
        }

        return t.arrayExpression(elements);
    }

    return t.nullLiteral();
}
