/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { RumAction, RumActionConstants } from '../../constants';
import type { PluginPassState, RumActionResult } from '../../types';
import { getArgumentsFromParams, getNodeName, toExpression } from '../../utils';

/**
 * Wraps a tap handler attribute (e.g., onPress) with RUM Action Tracking wrapper call.
 *
 * @param path - The JSXAttribute path for the handler prop (e.g., `onPress={...}`).
 * @param t - Babel types helper.
 * @param state - Plugin state, including tracked components and memoization cache.
 * @param actionResult - Extracted info about the attribute (parentName, propertyName, nodes, expression).
 * @returns A JSXExpressionContainer with the wrapped handler, or `null/undefined` if skipped.
 */
export function handleTapAction(
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    t: typeof Babel.types,
    state: PluginPassState,
    actionResult: RumActionResult
) {
    const { parentName, propertyName, propertyNode, expression } = actionResult;

    // The value of a JSXAttribute we want to target is always jsxExpressionContainer
    const isExpressionContainer = t.isJSXExpressionContainer(
        propertyNode.value
    );

    // Check if the property and element are valid by checking our trackedComponents list
    const mapEntry = state.trackedComponents?.[parentName];
    const isValidElement = !!mapEntry;
    const isValidEvent =
        mapEntry?.handlers.map(x => x.event).includes(propertyName) || false;

    const handler = state.trackedComponents?.[parentName]?.handlers.find(
        x => x.event === propertyName
    );

    if (!isExpressionContainer || !isValidEvent || !isValidElement) {
        return;
    }

    const isArrowFunc = t.isArrowFunctionExpression(expression);
    const isNamedFunc =
        t.isIdentifier(expression) || t.isMemberExpression(expression);

    if (!isArrowFunc && !isNamedFunc) {
        return;
    }

    // Tries to get the node corresponding to the function reference (if applicable)
    const { fName, fNode } = t.isIdentifier(expression)
        ? getNamedFunctionNode(path, t, expression, 'Component')
        : { fName: null, fNode: null };

    const handlerArgs =
        isArrowFunc && expression?.params
            ? t.arrayExpression(
                  getArgumentsFromParams(t, state, expression.params).callArgs
              )
            : t.arrayExpression([t.spreadElement(t.identifier('args'))]);

    if (path.node?.extra?.ddValues) {
        (path.node.extra.ddValues as any)['handlerArgs'] = handlerArgs;
    }

    const argsObject = t.objectExpression([
        ...Object.entries(path.node?.extra?.ddValues || {}).map(
            ([key, value]) => {
                return t.objectProperty(
                    t.stringLiteral(key),
                    toExpression(t, value)
                );
            }
        ),
        t.objectProperty(
            t.stringLiteral('componentName'),
            t.stringLiteral(parentName)
        )
    ]);

    // Used only for function references
    // Wraps our custom logic at the level of the memoization call insead of on the property level (default behaviour)
    const isMemoized =
        !isNamedFunc ||
        t.isClassDeclaration(fNode) ||
        t.isMemberExpression(expression)
            ? false
            : handleMemoization(
                  path,
                  t,
                  state,
                  expression,
                  fName,
                  fNode,
                  argsObject,
                  handler?.mode
              );

    let returnExpression: Babel.types.Expression | null = null;

    if (handler && handler?.mode === 'delayed') {
        returnExpression = expression;
    } else {
        returnExpression = isArrowFunc
            ? t.callExpression(
                  expression,
                  getArgumentsFromParams(t, state, expression.params).callArgs
              )
            : t.callExpression(expression, [
                  t.spreadElement(t.identifier('args'))
              ]);
    }

    state.hasValidTapAction = true;

    const expressionParams = 'params' in expression ? expression.params : null;

    return !isMemoized
        ? getActionWrapperNode(
              t,
              state,
              expression,
              expressionParams,
              returnExpression,
              argsObject,
              handler?.mode
          )
        : null;
}

/**
 * Attempts to resolve a named function reference within a component or the program scope.
 *
 * Search Types:
 *  - 'Component': nearest function/class component body (FunctionDeclaration, FunctionExpression, ClassDeclaration).
 *  - 'Program': the module/program scope.
 *
 * Returns the function name, the node (FunctionDeclaration or VariableDeclarator),
 * and the function parameters (to support accurate argument forwarding).
 *
 * @param path - The JSXAttribute path.
 * @param t - Babel types helper.
 * @param expression - Identifier referencing the function.
 * @param type - Search type: 'Component' or 'Program'.
 * @returns Object with `{ fName, fNode, fParams }`.
 */
function getNamedFunctionNode(
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    t: typeof Babel.types,
    expression: Babel.types.Identifier,
    type: 'Component' | 'Program'
): {
    fName: string | null;
    fNode:
        | babel.types.FunctionDeclaration
        | babel.types.VariableDeclarator
        | babel.types.ClassDeclaration
        | null;
    fParams: (
        | Babel.types.Identifier
        | Babel.types.RestElement
        | Babel.types.Pattern
    )[];
} {
    // Decides where to look, whether on the Program or the Component itself
    const predicate = (p: Babel.NodePath<Babel.types.Node>) =>
        type === 'Program'
            ? p.isProgram()
            : p.isFunctionDeclaration() ||
              p.isFunctionExpression() ||
              p.isClassDeclaration();

    const cPath = path.findParent(p => predicate(p)) || null;

    const fParams: (
        | Babel.types.Identifier
        | Babel.types.RestElement
        | Babel.types.Pattern
    )[] = [];

    let fName: string | null = null;
    let fNode:
        | babel.types.FunctionDeclaration
        | babel.types.VariableDeclarator
        | babel.types.ClassDeclaration
        | null = null;

    if (!cPath) {
        return { fName, fNode, fParams };
    }

    const getNodeInfo = (
        node: Babel.types.FunctionDeclaration | Babel.types.VariableDeclarator
    ) => {
        const varName = getNodeName(t, node.id || '');
        if (varName === expression.name) {
            fNode = node;
            fName = varName;
            return true;
        }

        return false;
    };

    // If able to find the Program/Component path
    // Traverse it and check if the function reference is of type function or variable declaration
    // Save the function data (name, node and params)
    cPath.traverse({
        VariableDeclarator(p) {
            const result = getNodeInfo(p.node);
            if (result && t.isArrowFunctionExpression(p.node.init)) {
                fParams.push(...p.node.init.params);
            }
        },
        FunctionDeclaration(p) {
            const result = getNodeInfo(p.node);
            if (result) {
                fParams.push(...p.node.params);
            }
        }
    });

    return { fName, fNode, fParams };
}

/**
 * If a handler is memoized via `useCallback` or `useMemo`, wraps the memoized callback instead
 * of the JSX prop directly, preserving memoization semantics.
 *
 * @param path - The JSXAttribute path where the memoized handler is referenced.
 * @param t - Babel types helper.
 * @param state - Plugin state, with `memoization` map.
 * @param fName - The variable name bound to the memoized value.
 * @param fNode - The variable declarator or function declaration of the memoized symbol.
 * @param argsObject - Datadog-specific args object (ddValues/options).
 * @param mode - Optional handler mode; when `'delayed'`, wrapper invocation is deferred.
 * @returns `true` if considered memoized (wrapped or intentionally skipped), else `false`.
 */
function handleMemoization(
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    t: typeof Babel.types,
    state: PluginPassState,
    _expression: Babel.types.Identifier,
    fName: string | null,
    fNode:
        | babel.types.FunctionDeclaration
        | babel.types.VariableDeclarator
        | null,
    argsObject: babel.types.ObjectExpression,
    mode?: string
) {
    if (!fName || !fNode || t.isFunctionDeclaration(fNode)) {
        return !!state.memoization?.[fName || ''];
    }

    const varInit = fNode.init;
    const isCallExpression = varInit && t.isCallExpression(varInit);
    const isValid = !state.memoization?.[fName];

    if (!isCallExpression || !isValid) {
        return !!state.memoization?.[fName];
    }

    let memoName: string | null = null;

    if (t.isIdentifier(varInit.callee)) {
        memoName = getNodeName(t, varInit.callee);
    } else if (t.isMemberExpression(varInit.callee)) {
        memoName = getNodeName(t, varInit.callee.property);
    }

    if (!memoName || !['useCallback', 'useMemo'].includes(memoName)) {
        return false;
    }

    const callbackFn = varInit.arguments.at(0);
    const handleWrapping = (
        callback:
            | Babel.types.Identifier
            | Babel.types.FunctionExpression
            | Babel.types.ArrowFunctionExpression,
        params: (
            | Babel.types.Identifier
            | Babel.types.RestElement
            | Babel.types.Pattern
        )[]
    ) => {
        const { callArgs } = getArgumentsFromParams(t, state, params);
        const returnExpression =
            mode === 'delayed'
                ? callback
                : t.callExpression(callback, callArgs);

        const actionWrapper = getActionWrapperFunction(
            t,
            state,
            callback,
            params,
            returnExpression,
            argsObject,
            mode
        );
        varInit.arguments.fill(actionWrapper, 0, 1);
        fNode.init = varInit;

        if (!state.memoization) {
            state.memoization = {};
        }

        if (memoName) {
            state.memoization[fName] = memoName;
        }
    };

    // This handles the scenario where `useCallback` is an arrow function
    if (t.isFunction(callbackFn)) {
        handleWrapping(callbackFn, callbackFn.params);
    }

    // This handles the scenario where `useCallback` is a function reference
    // It does not handle the scenario where a function is imported from outside
    // As we can't know for sure what arguments that function takes
    if (t.isIdentifier(callbackFn)) {
        const componentLevelData = getNamedFunctionNode(
            path,
            t,
            callbackFn,
            'Component'
        );
        const { fNode: node } = componentLevelData.fNode
            ? componentLevelData
            : getNamedFunctionNode(path, t, callbackFn, 'Program');

        // If we don't find the function reference neither in the component nor in the Program
        // We want to skip it any sort of wrapping because we want to avoid calling a function incorrectly
        // As such we 'fake' saying that the function is memoized because we use it as a criteria
        // For skipping wrapping on the JSXAttribute level
        if (!node) {
            return true;
        }

        const params: (
            | Babel.types.Identifier
            | Babel.types.RestElement
            | Babel.types.Pattern
        )[] = [];

        if (t.isFunctionDeclaration(node)) {
            params.push(...node.params);
        }

        if (
            t.isVariableDeclarator(node) &&
            t.isArrowFunctionExpression(node.init)
        ) {
            params.push(...node.init?.params);
        }

        handleWrapping(callbackFn, params);
    }

    return !!state.memoization?.[fName];
}

/**
 * Builds a JSXExpressionContainer containing an arrow function wrapper for the handler.
 *
 * This simply delegates to `getActionWrapperFunction` and then wraps the result
 * as a JSX expression for use directly as a prop value.
 *
 * @param t - Babel types helper.
 * @param state - Plugin state.
 * @param expression - The original handler expression (arrow fn or identifier/member).
 * @param expressionParams - Parameters of the original function, if known.
 * @param returnExpression - Expression to execute when not using the RUM wrapper (fallback).
 * @param argsObject - Datadog-specific args object (ddValues/options).
 * @param mode - Optional handler mode; when `'delayed'`, wrapper invocation is deferred.
 * @returns A JSXExpressionContainer that evaluates to the wrapped handler arrow function.
 */
function getActionWrapperNode(
    t: typeof Babel.types,
    state: PluginPassState,
    expression: Babel.types.Expression,
    expressionParams:
        | (
              | Babel.types.Identifier
              | Babel.types.RestElement
              | Babel.types.Pattern
          )[]
        | null,
    returnExpression: Babel.types.Expression,
    argsObject: Babel.types.ObjectExpression,
    mode?: string
) {
    const actionWrapperFunction = getActionWrapperFunction(
        t,
        state,
        expression,
        expressionParams,
        returnExpression,
        argsObject,
        mode
    );
    return t.jsxExpressionContainer(actionWrapperFunction);
}

/**
 * Constructs the actual wrapper arrow function that:
 *  - computes/normalizes parameters and pre-call statements,
 *  - attempts to call the RUM wrapper if the runtime instance is available,
 *  - otherwise falls back to calling the original handler directly.
 *
 * In 'delayed' mode, returns a function that defers invocation — the RUM wrapper
 * returns a callable which is later called with `callArgs`. Otherwise, it invokes
 * the wrapper immediately with `callArgs`.
 *
 * @param t - Babel types helper.
 * @param state - Plugin state (used by argument computation utilities).
 * @param expression - Original handler expression (arrow/name/member).
 * @param expressionParams - Original handler parameters, if known. If null, uses `...args`.
 * @param returnExpression - Fallback: direct call (or the function itself in delayed mode).
 * @param argsObject - Datadog-specific args object (ddValues/options).
 * @param mode - Optional handler mode; when `'delayed'`, wrapper invocation is deferred.
 * @returns An ArrowFunctionExpression that implements the described behavior.
 */
function getActionWrapperFunction(
    t: typeof Babel.types,
    state: PluginPassState,
    expression: Babel.types.Expression,
    expressionParams:
        | (
              | Babel.types.Identifier
              | Babel.types.RestElement
              | Babel.types.Pattern
          )[]
        | null,
    returnExpression: Babel.types.Expression,
    argsObject: Babel.types.ObjectExpression,
    mode?: string
) {
    const params = expressionParams || [t.restElement(t.identifier('args'))];

    const {
        wrapperParams,
        preCallStatements,
        callArgs
    } = getArgumentsFromParams(t, state, params);

    const wrapperExpression = t.callExpression(
        t.memberExpression(
            t.callExpression(
                t.memberExpression(
                    t.identifier(RumActionConstants.ACTION_CLASS),
                    t.identifier(RumActionConstants.ACTION_CLASS_INSTANCE)
                ),
                []
            ),
            t.identifier(RumActionConstants.ACTION_FUNCTION_WRAPPER)
        ),
        [expression, t.stringLiteral(RumAction.TAP), argsObject]
    );

    const wrapperExpressionImmediate = t.callExpression(
        wrapperExpression,
        callArgs
    );

    const outputExpression =
        mode === 'delayed' ? wrapperExpression : wrapperExpressionImmediate;

    return t.arrowFunctionExpression(
        wrapperParams,
        t.blockStatement([
            ...preCallStatements,
            t.ifStatement(
                t.callExpression(
                    t.memberExpression(
                        t.identifier(RumActionConstants.ACTION_CLASS),
                        t.identifier(RumActionConstants.ACTION_CLASS_INSTANCE)
                    ),
                    []
                ),
                t.returnStatement(outputExpression),
                t.returnStatement(returnExpression)
            )
        ])
    );
}
