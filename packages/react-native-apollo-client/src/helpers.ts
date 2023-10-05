/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * NOTE: Do not import from '@apollo/client/utilities' as the package does not exist in Apollo Client < v3.
 */

import type { Operation } from '@apollo/client';
import type { DefinitionNode, OperationDefinitionNode } from 'graphql';

export const getVariables = (operation: Operation): string | null => {
    if (operation.variables) {
        try {
            return JSON.stringify(operation.variables);
        } catch (e) {
            // TODO RUM-1206: telemetry
            return null;
        }
    }
    return null;
};

export const getOperationName = (operation: Operation): string | null => {
    if (operation.operationName) {
        return operation.operationName;
    }
    return null;
};

const getOperationDefinitionNode = (
    definition: DefinitionNode
): definition is OperationDefinitionNode => {
    return definition.kind === 'OperationDefinition' && !!definition.operation;
};

export const getOperationType = (
    operation: Operation
): 'query' | 'mutation' | 'subscription' | null => {
    try {
        return (
            operation.query.definitions
                .filter(getOperationDefinitionNode)
                .map(operationDefinitionNode => {
                    return operationDefinitionNode.operation;
                })[0] || null
        );
    } catch (e) {
        // TODO RUM-1206: telemetry
        return null;
    }
};
