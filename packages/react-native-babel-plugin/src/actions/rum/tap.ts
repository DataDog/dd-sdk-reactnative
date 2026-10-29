/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import traverse from '@babel/traverse';

import { RumAction, RumActionConstants } from '../../constants';
import type { PluginPassState, RumActionResult } from '../../types';
import { getArgumentsFromParams, getNodeName, toExpression } from '../../utils';

type HandlerParams = Parameters<typeof getArgumentsFromParams>[2];

type MemoArgsObjects = Record<
    'useCallback' | 'useMemo',
    Babel.types.ObjectExpression
>;

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

    const getArgsObject = (ddValues: unknown) =>
        t.objectExpression([
            ...Object.entries(ddValues || {}).map(([key, value]) => {
                return t.objectProperty(
                    t.stringLiteral(key),
                    toExpression(t, value)
                );
            }),
            t.objectProperty(
                t.stringLiteral('componentName'),
                t.stringLiteral(parentName)
            )
        ]);

    const argsObject = getArgsObject(path.node?.extra?.ddValues);

    // Memoized handlers are wrapped in the component body, outside the JSX scope
    const hoistedArgsObjects: MemoArgsObjects = {
        useCallback: path.node?.extra?.hoistedDdValues
            ? getArgsObject(path.node.extra.hoistedDdValues)
            : argsObject,
        useMemo: path.node?.extra?.factoryDdValues
            ? getArgsObject(path.node.extra.factoryDdValues)
            : argsObject
    };

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
                  hoistedArgsObjects,
                  handler?.mode
              );

    state.hasValidTapAction = true;

    return !isMemoized
        ? getActionWrapperNode(
              t,
              path,
              state,
              expression,
              isArrowFunc ? expression.params : null,
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
 * @param argsObjects - Datadog-specific args objects (ddValues/options), one per memoization hook.
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
    argsObjects: MemoArgsObjects,
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

    if (memoName !== 'useCallback' && memoName !== 'useMemo') {
        return false;
    }

    const argsObject = argsObjects[memoName];

    const callbackFn = varInit.arguments.at(0);
    const handleWrapping = (
        callback:
            | Babel.types.Identifier
            | Babel.types.FunctionExpression
            | Babel.types.ArrowFunctionExpression,
        params: HandlerParams | null
    ) => {
        const actionWrapper = getActionWrapperFunction(
            t,
            path,
            state,
            callback,
            params,
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

        const params = t.isFunctionDeclaration(node)
            ? node.params
            : t.isVariableDeclarator(node) && t.isFunction(node.init)
            ? node.init.params
            : null;
        handleWrapping(callbackFn, params);
    }

    return !!state.memoization?.[fName];
}

/**
 * Wraps the generated handler function in a JSX expression container.
 */
function getActionWrapperNode(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    state: PluginPassState,
    expression: Babel.types.Expression,
    params: HandlerParams | null,
    argsObject: Babel.types.ObjectExpression,
    mode?: string
) {
    return t.jsxExpressionContainer(
        getActionWrapperFunction(
            t,
            path,
            state,
            expression,
            params,
            argsObject,
            mode
        )
    );
}

/**
 * Retains parameter defaults and declared-argument selection, but gives wrapper
 * bindings fresh names before tracking expressions or the original handler are
 * inserted. Renaming within a temporary function also updates defaults that
 * reference preceding parameters, without changing customer JSX bindings.
 */
function getWrapperArguments(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    state: PluginPassState,
    params: HandlerParams | null
) {
    const reserved = new Set(
        (params || []).flatMap(param =>
            Object.keys(t.getBindingIdentifiers(param))
        )
    );
    const generateUid = (hint: string) => {
        let id = path.scope.generateUidIdentifier(hint);
        while (reserved.has(id.name)) {
            id = path.scope.generateUidIdentifier(hint);
        }
        reserved.add(id.name);
        return id;
    };
    const originalParams = params?.length
        ? params.map(param => t.cloneNode(param, true))
        : [t.restElement(generateUid('ddArgs'))];
    const { wrapperParams, callArgs } = getArgumentsFromParams(
        t,
        state,
        originalParams,
        generateUid
    );
    const args = t.arrayExpression(callArgs.map(arg => t.cloneNode(arg, true)));
    const wrapper = t.arrowFunctionExpression(wrapperParams, args);

    // Keep metadata and the original handler out of this temporary scope: only
    // the copied parameters and references in the forwarding arguments may change.
    traverse(t.file(t.program([t.expressionStatement(wrapper)])), {
        ArrowFunctionExpression(wrapperPath) {
            if (wrapperPath.node === wrapper) {
                for (const name of Object.keys(wrapperPath.scope.bindings)) {
                    wrapperPath.scope.rename(name, generateUid('ddArg').name);
                }
                wrapperPath.stop();
            }
        }
    });

    return {
        wrapperParams: wrapper.params,
        getCallArgs: () =>
            args.elements.map(arg =>
                t.cloneNode(
                    arg as Babel.types.Expression | Babel.types.SpreadElement,
                    true
                )
            )
    };
}

/**
 * Forwards normalized arguments through collision-free wrapper parameters.
 * Destructuring runs only in the original handler; simple parameter defaults run
 * in the wrapper and their resolved values are forwarded to tracking and the handler.
 * Delayed mode returns the tracked/original function without invoking it.
 */
function getActionWrapperFunction(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    state: PluginPassState,
    expression: Babel.types.Expression,
    params: HandlerParams | null,
    argsObject: Babel.types.ObjectExpression,
    mode?: string
) {
    const { wrapperParams, getCallArgs } = getWrapperArguments(
        t,
        path,
        state,
        params
    );
    argsObject.properties.push(
        t.objectProperty(
            t.stringLiteral('handlerArgs'),
            t.arrayExpression(getCallArgs())
        )
    );

    const returnExpression =
        mode === 'delayed'
            ? expression
            : t.optionalCallExpression(expression, getCallArgs(), true);

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

    const outputExpression =
        mode === 'delayed'
            ? wrapperExpression
            : t.callExpression(wrapperExpression, getCallArgs());

    return t.arrowFunctionExpression(
        wrapperParams,
        t.blockStatement([
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
