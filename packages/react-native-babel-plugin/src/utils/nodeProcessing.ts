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

    if (t.isJSXMemberExpression(node)) {
        if (t.isJSXIdentifier(node.object)) {
            return `${node.object.name}.${node.property.name}`;
        }

        let nodeName = node.property.name;
        let nodeTracker:
            | Babel.types.JSXIdentifier
            | Babel.types.JSXMemberExpression = node.object;

        while (t.isJSXMemberExpression(nodeTracker)) {
            nodeName = `${nodeTracker.property.name}.${nodeName}`;
            nodeTracker = nodeTracker.object;
        }

        if (t.isJSXIdentifier(nodeTracker)) {
            nodeName = `${nodeTracker.name}.${nodeName}`;
        }

        return nodeName;
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

/**
 * Extracts the name and statically-evaluable value from a given JSX attribute.
 *
 * This function supports JSX attributes where the value is either:
 * - A string literal (e.g., `fill="red"`)
 * - An expression container that can be statically evaluated (e.g., `fill={"red"}`, or arrays like `transform={[{ rotate: "45deg" }]}`)
 *
 * If the value is dynamic, non-literal, or not supported (e.g., function calls, identifiers, complex objects),
 * the function returns `{ name: null, value: null }`.
 *
 * @param t - Babel types helper for AST manipulation.
 * @param attr - The JSXAttribute node to extract data from.
 * @returns An object with the statically-evaluable attribute name and value:
 *          - `name`: The attribute's name (e.g., "fill", "translateX") or `null` if not extractable.
 *          - `value`: A string, number, or array of strings/numbers if statically evaluable, otherwise `null`.
 */
export function getJSXAttributeData(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute
): {
    name: string | null;
    value: string | number | (string | number)[] | null;
} {
    const name = getNodeName(t, attr.name);
    const result: {
        name: string | null;
        value: string | number | (string | number)[] | null;
    } = {
        name: null,
        value: null
    };

    if (!name || !attr.value) {
        return result;
    }

    let expression: Babel.types.Node | null = null;

    if (t.isJSXExpressionContainer(attr.value)) {
        expression = attr.value.expression;
    } else if (t.isStringLiteral(attr.value)) {
        expression = attr.value;
    } else {
        return result; // Not supported
    }

    const staticValue = evaluateStaticNode(t, expression);

    if (
        typeof staticValue === 'string' ||
        typeof staticValue === 'number' ||
        (Array.isArray(staticValue) &&
            staticValue.every(
                v => typeof v === 'string' || typeof v === 'number'
            ))
    ) {
        result.name = name;
        result.value = staticValue;
    }

    return result;
}

/**
 * Recursively evaluates a Babel AST node into a static JS value.
 * Returns `null` if any non-static construct is encountered.
 *
 * Supported:
 * - ObjectExpression (with simple keys and nested values)
 * - ArrayExpression (e.g., style arrays, transform arrays)
 * - NumericLiteral, StringLiteral, BooleanLiteral, NullLiteral
 * - UnaryExpression (+/-) over NumericLiteral
 * - TemplateLiteral without expressions
 * - ConditionalExpression if both sides static
 * - LogicalExpression (||, &&, ??) if both sides static
 *
 * NOT supported (returns null):
 * - Identifier, MemberExpression, CallExpression, NewExpression, SpreadElement, Function nodes, etc.
 */
export function evaluateStaticNode(
    t: typeof Babel.types,
    node: Babel.types.Node | null | undefined
): any {
    if (!node) {
        return null;
    }

    // --- Literals
    if (t.isNullLiteral(node)) {
        return null;
    }
    if (t.isNumericLiteral(node)) {
        return node.value;
    }
    if (t.isBooleanLiteral(node)) {
        return node.value;
    }
    if (t.isStringLiteral(node)) {
        return node.value;
    }
    if (t.isTemplateLiteral(node)) {
        if (node.expressions.length === 0 && node.quasis.length === 1) {
            return node.quasis[0].value.cooked ?? '';
        }
        return null; // dynamic template
    }

    // --- Unary +/- on numeric literal
    if (t.isUnaryExpression(node) && t.isNumericLiteral(node.argument)) {
        if (node.operator === '-') {
            return -node.argument.value;
        }
        if (node.operator === '+') {
            return +node.argument.value;
        }
        return null;
    }

    // --- Arrays
    if (t.isArrayExpression(node)) {
        const out: any[] = [];
        for (const el of node.elements) {
            if (!el) {
                out.push(null);
                continue;
            }
            if (t.isSpreadElement(el)) {
                return null; // dynamic spread in array
            }
            const v = evaluateStaticNode(t, el as any);
            if (v === undefined) {
                // keep undefined? RN style ignores undefined; we can drop it
                continue;
            }
            out.push(v);
        }
        return out;
    }

    // --- Objects
    if (t.isObjectExpression(node)) {
        const obj: Record<string, any> = {};
        for (const p of node.properties) {
            if (t.isSpreadElement(p)) {
                return null; // dynamic spread
            }
            if (!t.isObjectProperty(p)) {
                return null; // methods/getters/setters not expected in style
            }

            // Key can be Identifier or StringLiteral (computed keys are not supported here)
            let key: string | null = null;
            if (t.isIdentifier(p.key) && !p.computed) {
                key = p.key.name;
            } else if (t.isStringLiteral(p.key) && !p.computed) {
                key = p.key.value;
            } else {
                return null; // computed or unsupported key
            }

            const value = evaluateStaticNode(t, p.value as any);
            // RN style ignores undefined; omit null/undefined keys
            if (key && value !== undefined) {
                obj[key] = value;
            }
        }
        return obj;
    }

    // --- Conditional (ternary): only if both sides static
    if (t.isConditionalExpression(node)) {
        const c = evaluateStaticNode(t, node.consequent);
        const a = evaluateStaticNode(t, node.alternate);
        if (c === null && a === null) {
            return null;
        }
        if (c !== null && a !== null) {
            // We can't evaluate the test safely; choose neither → bail or pick one?
            // Safer: bail to avoid wrong choice.
            return null;
        }
        return null; // keep conservative; you can relax if you want to pick a branch
    }

    // --- Logical expressions (||, &&, ??) if both sides static (conservative)
    if (t.isLogicalExpression(node)) {
        const left = evaluateStaticNode(t, node.left);
        const right = evaluateStaticNode(t, node.right);
        if (left === null && right === null) {
            return null;
        }
        // Still conservative: without evaluating truthiness rules exactly, bail
        return null;
    }

    // Everything else considered dynamic for our purposes
    // (Identifiers, MemberExpressions, CallExpressions, NewExpressions, etc.)
    return null;
}

export function parseStyleNode(
    t: typeof Babel.types,
    attr: Babel.types.JSXAttribute
): Record<string, any> | null {
    if (!attr.value) {
        return null;
    }

    // style="..." → not a valid RN style object
    if (t.isStringLiteral(attr.value)) {
        return null;
    }

    if (t.isJSXExpressionContainer(attr.value)) {
        const v = attr.value.expression;

        // style={{ ... }}  or  style={[ ... ]}
        const evaluated = evaluateStaticNode(t, v);
        if (evaluated == null) {
            return null;
        }

        // If the top-level is an array, merge object entries (RN allows style arrays)
        if (Array.isArray(evaluated)) {
            const merged: Record<string, any> = {};
            for (const item of evaluated) {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    Object.assign(merged, item);
                } else if (item == null) {
                    // ignore null/undefined
                } else {
                    // Non-object entries in a style array are not expected; bail
                    return null;
                }
            }
            return merged;
        }

        // If it's already an object, return it
        if (evaluated && typeof evaluated === 'object') {
            return evaluated as Record<string, any>;
        }

        // Any other type at top-level is not a valid style object
    }

    return null;
}

/**
 * Searches for a variable declaration in the given scope and returns its static value.
 *
 * @param t - Babel types helper.
 * @param scopePath - The scope path to search in (e.g., function, class, or program).
 * @param variableName - The name of the variable to find.
 * @returns The static value of the variable (string or number), or null if not found or not static.
 */
export function findIdentifierInScope(
    t: typeof Babel.types,
    scopePath: Babel.NodePath<Babel.types.Node>,
    variableName: string
): string | number | null {
    let foundValue: string | number | null = null;

    scopePath.traverse({
        VariableDeclarator(path) {
            // Here we check for `parentPath` twice because nodes like variables are usually inside `BlockStatement` nodes
            // So we need to get past those to get the right parentPath
            if (path.parentPath?.parentPath !== scopePath) {
                return;
            }

            const nodeName = getNodeName(t, path.node.id);
            if (
                t.isIdentifier(path.node.id) &&
                nodeName === variableName &&
                path.node.init
            ) {
                const staticValue = evaluateStaticNode(t, path.node.init);
                if (
                    typeof staticValue === 'string' ||
                    typeof staticValue === 'number'
                ) {
                    foundValue = staticValue;
                    path.stop();
                }
            }
        }
    });

    return foundValue;
}
