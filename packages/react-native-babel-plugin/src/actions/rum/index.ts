/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';
import { addNamed } from '@babel/helper-module-imports';
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
    insertAtProgramTop,
    toExpression
} from '../../utils';

import { handleTapAction } from './tap';

/**
 * Inserts RUM Action Tracking import at the top of the Program.
 *
 * Adds a single import declaration for:
 *   - the action tracking class (e.g., `DdBabelInteractionTracking`)
 *   - the text extraction helper (`__ddExtractText`)
 *
 * @param t      Babel types helper.
 * @param path   Program path to mutate.
 */
export function insertRumActionImport(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.Program>
) {
    // Build the import declaration for the runtime + helper
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

/**
 * Main entry point to wrap a JSX element's relevant attributes (handlers + DD props)
 * with RUM action tracking.
 *
 * @param componentName         The host component name (e.g., "GestureButton").
 * @param t                     Babel types helper.
 * @param path                  JSXElement path to process.
 * @param state                 Plugin state containing `trackedComponents` and config.
 * @param options               Plugin options (e.g., custom action name attribute).
 */
export function handleJSXElementActionPaths(
    componentName: string,
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXElement>,
    state: PluginPassState,
    options: PluginOptions
) {
    // Avoid double-processing the same element
    if (path.node?.extra?.__wrappedForRum) {
        return;
    }

    // Gather targets and construct ddValues/options
    const {
        actionPathList,
        actionPathNames,
        ddValues
    } = getJSXElementActionPaths(componentName, t, path, state, options);

    // Create known custom components list tracked by the plugin
    const componentNameList = state.trackedComponents
        ? Object.keys(state.trackedComponents)
        : [];

    // Only inject mandatory attributes for native components, NOT options tracked components
    // Options tracked components define their own handlers and should not have additional ones injected
    const isOptionsTrackedComponent = options.components.tracked.find(
        x => x.name === componentName
    );

    if (
        !isOptionsTrackedComponent &&
        componentNameList.includes(componentName)
    ) {
        // Some native components need specific handlers present (inject no-op handlers if missing)
        ensureMandatoryAttributes(
            path,
            componentName,
            actionPathList,
            actionPathNames
        );
    }

    // Optionally compute a content getter (children + label props)
    const programPath = path.findParent(p =>
        p.isProgram()
    ) as Babel.NodePath<Babel.types.Program>;
    setContentAttribute(componentName, t, path, state, ddValues, programPath);

    // Wrap every actionable handler attribute with RUM
    for (const attrPath of actionPathList) {
        attrPath.node.extra = {
            ...attrPath.node.extra,
            ddValues
        };
        handleRumActions(t, attrPath, state, componentNameList);
    }
}

/**
 * Ensures that all mandatory handler attributes exist on the element so that
 * they can be wrapped by RUM even if the user didn't specify them.
 *
 * Example:
 *  Some inputs require `onFocus`/`onBlur` for reliable action boundaries.
 *  If missing, we inject `() => {}` as a placeholder and mark those paths
 *  as actionable so they get wrapped downstream.
 *
 * IMPORTANT: If the element has spread attributes (e.g., {...props}), we cannot
 * safely inject handlers because we don't know at build time what props are being
 * spread. In such cases, we skip injection to avoid overwriting existing handlers.
 *
 * @param path               JSXElement path.
 * @param componentName      Host component name for lookup in `tapElementsRequiredAttributesMap`.
 * @param actionPathList     Collected actionable attribute paths (will be appended to).
 * @param actionPathNames    Names of actionable attributes already present.
 */
export function ensureMandatoryAttributes(
    path: Babel.NodePath<Babel.types.JSXElement>,
    componentName: string,
    actionPathList: Babel.NodePath<Babel.types.JSXAttribute>[],
    actionPathNames: string[]
) {
    // Check if there are any spread attributes
    const hasSpreadAttributes = path.node.openingElement.attributes.some(
        attr => attr.type === 'JSXSpreadAttribute'
    );

    // If spread attributes exist, we cannot safely inject handlers
    // because we don't know what props are being spread at build time
    if (hasSpreadAttributes) {
        return;
    }

    // Resolve any mandatory attributes for this component
    const requiredAttributes = tapElementsRequiredAttributesMap[componentName];
    if (requiredAttributes) {
        // Determine missing ones
        const attrToAdd = requiredAttributes.filter(
            x => !actionPathNames.includes(x)
        );

        for (const attr of attrToAdd) {
            // Inject a no-op handler: () => {}
            const attribute = jsxAttribute(
                jsxIdentifier(attr),
                jsxExpressionContainer(
                    arrowFunctionExpression([], blockStatement([]))
                )
            );
            path.node.openingElement.attributes.push(attribute);

            // Grab attribute paths and append the new one to action list
            const attrPaths = path.get(
                'openingElement.attributes'
            ) as Babel.NodePath<Babel.types.JSXAttribute>[];

            const lastPath = attrPaths[attrPaths.length - 1];

            actionPathList.push(lastPath);
        }
    }
}

/**
 * Converts a JSX child AST node into a jsx()/jsxs() runtime call.
 * This avoids emitting raw JSX in generated code, which is necessary because
 * Babel presets (including the JSX transform) run before plugins — so any
 * JSX nodes created by this plugin would survive untransformed into the bundle.
 *
 * Uses `@babel/helper-module-imports` to add `jsx`/`jsxs`/`Fragment` imports
 * from `react/jsx-runtime`, matching the approach of `@babel/plugin-transform-react-jsx`.
 */
function jsxChildToRuntimeCall(
    t: typeof Babel.types,
    child: Babel.types.Node,
    programPath: Babel.NodePath<Babel.types.Program>
): Babel.types.Expression | null {
    if (t.isJSXText(child)) {
        const text = child.value.replace(/\n\s*/g, ' ').trim();
        if (!text) {
            return null;
        }
        return t.stringLiteral(text);
    }

    if (t.isJSXExpressionContainer(child)) {
        if (t.isJSXEmptyExpression(child.expression)) {
            return null;
        }
        // Recursively process the inner expression to handle JSX inside
        // ternaries, logical expressions, etc. Fall back to cloning if the
        // expression type is not one we explicitly handle.
        return (
            jsxChildToRuntimeCall(t, child.expression, programPath) ||
            t.cloneNode(child.expression as Babel.types.Expression, true)
        );
    }

    // Handle ternary expressions like: condition ? <A/> : <B/>
    if (t.isConditionalExpression(child)) {
        const consequent = jsxChildToRuntimeCall(
            t,
            child.consequent,
            programPath
        );
        const alternate = jsxChildToRuntimeCall(
            t,
            child.alternate,
            programPath
        );
        if (consequent === null && alternate === null) {
            return t.cloneNode(child, true);
        }
        return t.conditionalExpression(
            t.cloneNode(child.test, true),
            consequent || t.cloneNode(child.consequent, true),
            alternate || t.cloneNode(child.alternate, true)
        );
    }

    // Handle logical expressions like: condition && <A/>
    if (t.isLogicalExpression(child)) {
        const right = jsxChildToRuntimeCall(t, child.right, programPath);
        if (right === null) {
            return t.cloneNode(child, true);
        }
        return t.logicalExpression(
            child.operator,
            t.cloneNode(child.left, true),
            right
        );
    }

    if (t.isJSXElement(child)) {
        const opening = child.openingElement;
        const elementName = getNodeName(t, opening.name);

        // Build the element name as an identifier or member expression
        let nameNode: Babel.types.Expression;
        if (elementName && elementName.includes('.')) {
            const parts = elementName.split('.');
            nameNode = parts.reduce<Babel.types.Expression>(
                (obj, prop) =>
                    obj === null
                        ? t.identifier(prop)
                        : t.memberExpression(obj, t.identifier(prop)),
                (null as unknown) as Babel.types.Expression
            );
        } else if (elementName && t.isValidIdentifier(elementName)) {
            nameNode = t.identifier(elementName);
        } else if (elementName) {
            nameNode = t.stringLiteral(elementName);
        } else {
            nameNode = addNamed(programPath, 'Fragment', 'react/jsx-runtime');
        }

        // Convert props to an object
        const propEntries = opening.attributes
            .filter((attr): attr is Babel.types.JSXAttribute =>
                t.isJSXAttribute(attr)
            )
            .map(attr => {
                const key =
                    t.isJSXIdentifier(attr.name) &&
                    t.isValidIdentifier(attr.name.name)
                        ? t.identifier(attr.name.name)
                        : t.stringLiteral(getNodeName(t, attr.name) || '');

                let value: Babel.types.Expression;
                if (!attr.value) {
                    value = t.booleanLiteral(true);
                } else if (t.isStringLiteral(attr.value)) {
                    value = t.cloneNode(attr.value, true);
                } else if (t.isJSXExpressionContainer(attr.value)) {
                    value = t.cloneNode(
                        attr.value.expression as Babel.types.Expression,
                        true
                    );
                } else {
                    value = t.nullLiteral();
                }
                return t.objectProperty(key, value);
            });

        // Recursively convert children
        const childExprs = child.children
            .map(c => jsxChildToRuntimeCall(t, c, programPath))
            .filter((x): x is Babel.types.Expression => x !== null);

        // Build the props object with children
        if (childExprs.length === 1) {
            propEntries.push(
                t.objectProperty(t.identifier('children'), childExprs[0])
            );
        } else if (childExprs.length > 1) {
            propEntries.push(
                t.objectProperty(
                    t.identifier('children'),
                    t.arrayExpression(childExprs)
                )
            );
        }

        const propsObj =
            propEntries.length > 0
                ? t.objectExpression(propEntries)
                : t.objectExpression([]);

        // Use jsxs for multiple children, jsx for single/none
        const runtimeFn =
            childExprs.length > 1
                ? addNamed(programPath, 'jsxs', 'react/jsx-runtime')
                : addNamed(programPath, 'jsx', 'react/jsx-runtime');

        return t.callExpression(t.cloneNode(runtimeFn), [nameNode, propsObj]);
    }

    if (t.isJSXFragment(child)) {
        const childExprs = child.children
            .map(c => jsxChildToRuntimeCall(t, c, programPath))
            .filter((x): x is Babel.types.Expression => x !== null);

        const fragmentId = addNamed(
            programPath,
            'Fragment',
            'react/jsx-runtime'
        );

        const props =
            childExprs.length === 1
                ? t.objectExpression([
                      t.objectProperty(t.identifier('children'), childExprs[0])
                  ])
                : t.objectExpression([
                      t.objectProperty(
                          t.identifier('children'),
                          t.arrayExpression(childExprs)
                      )
                  ]);

        const runtimeFn =
            childExprs.length > 1
                ? addNamed(programPath, 'jsxs', 'react/jsx-runtime')
                : addNamed(programPath, 'jsx', 'react/jsx-runtime');

        return t.callExpression(t.cloneNode(runtimeFn), [
            t.cloneNode(fragmentId),
            props
        ]);
    }

    return null;
}

/**
 * Optionally attaches a `getContent` resolver into `ddValues` that, at runtime,
 * returns a string derived from:
 *   - the element's children (rendered via a React.createElement(Fragment) call)
 *   - common label-like props (`trackingLabel`, `title`, `label`, `text`, plus an optional custom prop)
 *
 * @param componentName  Host component name (controls whether content is used).
 * @param t              Babel types helper.
 * @param path           JSXElement path.
 * @param state          Plugin state with trackedComponents metadata.
 * @param ddValues       Mutable map of computed values attached to attributes via `node.extra.ddValues`.
 * @param programPath   Program path for inserting jsx-runtime imports.
 */
export function setContentAttribute(
    componentName: string,
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXElement>,
    state: PluginPassState,
    ddValues: Record<
        string,
        | Babel.types.ArrayExpression
        | Babel.types.ArrowFunctionExpression
        | Babel.types.ObjectExpression
    >,
    programPath: Babel.NodePath<Babel.types.Program>
) {
    const componentData = state.trackedComponents?.[componentName];
    if (componentData?.useContent) {
        // Potential prop names to get text content from
        const LABEL_PROPS = ['trackingLabel', 'title', 'label', 'text'];

        if (componentData?.contentProp) {
            LABEL_PROPS.push(componentData.contentProp);
        }

        // Retrieve literal/expr values from matching attributes
        const candidates: Babel.types.Expression[] = [];
        for (const name of LABEL_PROPS) {
            const attr = (path.node.openingElement.attributes as (
                | Babel.types.JSXAttribute
                | Babel.types.JSXSpreadAttribute
            )[]).find(
                a => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name })
            ) as Babel.types.JSXAttribute | undefined;

            if (!attr) {
                continue;
            }

            if (!attr.value) {
                continue; // if boolean shorthand - skip
            }

            if (t.isStringLiteral(attr.value)) {
                candidates.push(attr.value);
            } else if (t.isJSXExpressionContainer(attr.value)) {
                candidates.push(
                    attr.value.expression as Babel.types.Expression
                );
            }
        }

        // Convert children to jsx()/jsxs() runtime calls instead of cloning
        // raw JSX nodes. Babel presets (including the JSX transform) run before
        // plugins, so any JSX nodes created here would survive untransformed.
        const convertedChildren = path.node.children
            .map(child => jsxChildToRuntimeCall(t, child, programPath))
            .filter((x): x is Babel.types.Expression => x !== null);

        const fragmentId = addNamed(
            programPath,
            'Fragment',
            'react/jsx-runtime'
        );

        const childrenProp =
            convertedChildren.length === 1
                ? t.objectProperty(
                      t.identifier('children'),
                      convertedChildren[0]
                  )
                : convertedChildren.length > 1
                ? t.objectProperty(
                      t.identifier('children'),
                      t.arrayExpression(convertedChildren)
                  )
                : null;

        const fragmentProps = childrenProp
            ? t.objectExpression([childrenProp])
            : t.objectExpression([]);

        const runtimeFn =
            convertedChildren.length > 1
                ? addNamed(programPath, 'jsxs', 'react/jsx-runtime')
                : addNamed(programPath, 'jsx', 'react/jsx-runtime');

        const fragment = t.callExpression(t.cloneNode(runtimeFn), [
            t.cloneNode(fragmentId),
            fragmentProps
        ]);

        // () => __ddExtractText(jsxs(Fragment, { children: [...] }), [candidates...])
        const getContentNode = t.arrowFunctionExpression(
            [],
            t.blockStatement([
                t.returnStatement(
                    t.callExpression(t.identifier('__ddExtractText'), [
                        fragment,
                        t.arrayExpression(
                            candidates.map(e => t.cloneNode(e, true))
                        )
                    ])
                )
            ])
        );

        ddValues.getContent = getContentNode;
    }
}

/**
 * Scans a JSXElement and derives:
 *   - `actionPathList`: attribute paths to wrap (based on configured handler names)
 *   - `actionPathNames`: the corresponding attribute names
 *   - `ddValues`: arrays of Datadog-specific attributes (e.g., data-dd-action-name),
 *                and an `options` object based on the tracked component config
 *
 * @param componentName  Host component name to look up handlers/flags.
 * @param t              Babel types helper.
 * @param path           JSXElement path.
 * @param state          Plugin state.
 * @param options        Plugin options.
 */
export function getJSXElementActionPaths(
    componentName: string,
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXElement>,
    state: PluginPassState,
    options: PluginOptions
) {
    // DD attributes to collect (plus optional custom action name attribute)
    const ddAttrs = [
        ...rumComponentAttributes,
        options.actionNameAttribute ?? null
    ].filter(Boolean);

    // Map for dd attributes and misc options
    const ddValues: Record<
        string,
        | Babel.types.ArrayExpression
        | Babel.types.ArrowFunctionExpression
        | Babel.types.ObjectExpression
    > = {};

    // Handler names to consider actionable (e.g., onPress, onLongPress)
    const actionMapList =
        state.trackedComponents?.[componentName]?.handlers.map(x => x.event) ||
        [];

    const actionPathList: Babel.NodePath<Babel.types.JSXAttribute>[] = [];
    const actionPathNames: string[] = [];

    // Add options if this component is tracked
    if (state.trackedComponents?.[componentName]) {
        ddValues['options'] = t.objectExpression([
            t.objectProperty(
                t.stringLiteral('useContent'),
                toExpression(
                    t,
                    state.trackedComponents?.[componentName].useContent
                )
            ),

            t.objectProperty(
                t.stringLiteral('useNamePrefix'),
                toExpression(
                    t,
                    state.trackedComponents?.[componentName].useNamePrefix
                )
            )
        ]);
    }

    // Traverse attributes to collect DD props and actionable handlers
    path.traverse({
        JSXAttribute(subpath) {
            if (!subpath.node.extra) {
                subpath.node.extra = {};
            }

            const attrName = getNodeName(t, subpath.node.name);
            if (!attrName) {
                return;
            }

            // Collect literal DD attributes into arrays inside ddValues
            // Required for handling `CompoundComponents`
            const isValidAttr = ddAttrs.includes(attrName);
            if (isValidAttr) {
                const data = subpath.node.value;

                if (t.isStringLiteral(data)) {
                    if (!ddValues[attrName]) {
                        ddValues[attrName] = t.arrayExpression([]);
                    }

                    const valuesArray = ddValues[attrName];
                    if (t.isArrayExpression(valuesArray)) {
                        valuesArray.elements.push(data);
                    }
                }

                return;
            }

            // Accumulate handler attributes that we should wrap
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

/**
 * Wraps a specific JSXAttribute (e.g., onPress, onLongPress, onCustomAction) with the Datadog RUM handler.
 *
 * @param t                 Babel types helper.
 * @param path              Attribute path to wrap.
 * @param state             Plugin state.
 * @param componentNameList Names of custom components already handled by the plugin.
 */
export function handleRumActions(
    t: typeof Babel.types,
    path: Babel.NodePath<Babel.types.JSXAttribute>,
    state: PluginPassState,
    componentNameList: string[]
) {
    // Skip if already processed
    if (path.node?.extra?.__wrappedForRum) {
        return;
    }

    // Skip if nested in a component we should not track OR
    // Custom tracked component (that already wraps internally)
    const validParent = checkValidParent(t, path, componentNameList);
    if (!validParent) {
        return;
    }

    // Confirm we have a proper actionable attribute and extract details
    const { success, result } = checkValidAction(t, path);
    if (!success || !result) {
        return;
    }

    // Create a wrapping function to Handler RUM Actions
    const containerExpression = handleTapAction(path, t, state, result);

    if (!containerExpression) {
        return;
    }

    // Replace attribute's value with the wrapping function
    // Mark it as wrapped
    path.node.value = containerExpression;
    path.node.extra = {
        ...path.node.extra,
        __wrappedForRum: true
    };
}

/**
 * Determines whether the attribute’s enclosing component should be wrapped here.
 *
 * @param t                   Babel types helper.
 * @param path                Attribute path.
 * @param componentNameList   Names of custom components tracked by this plugin.
 * @returns                   `true` if safe to wrap; `false` to skip.
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
        } else if (
            t.isFunctionDeclaration(node) ||
            t.isClassDeclaration(node)
        ) {
            const cNode = node.id;
            parentName = cNode ? getNodeName(t, cNode) : null;
        }
        // If the nearest declaration is a tracked component, we skip wrapping here.
        if (parentName && componentNameList.includes(parentName)) {
            return false;
        }
    }

    return true;
}

/**
 * Validates that a JSXAttribute is a proper action candidate and extracts the
 * essential details needed to build the wrapper.
 *
 * @param t       Babel types helper.
 * @param path    Attribute path under test.
 * @returns       `{ success: boolean, result: RumActionResult | null }`
 *                `success=false` when the attribute isn't suitable for wrapping.
 */
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

    // If any required piece is missing, do not attempt to wrap
    if (
        !parentNode ||
        !parentName ||
        !propertyName ||
        !propertyValue ||
        !expression
    ) {
        return { success: false, result: null };
    }

    // Provide the wrapper all the pieces it needs
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
