/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import type { AssignmentNode, BabelTypes } from '../types';

export function insertAtProgramTop(
    path: Babel.NodePath<Babel.types.Program>,
    node: Babel.types.Statement | Babel.types.ModuleDeclaration
) {
    path.unshiftContainer('body', node);
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

export function getAssignmentNode(
    t: BabelTypes,
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
