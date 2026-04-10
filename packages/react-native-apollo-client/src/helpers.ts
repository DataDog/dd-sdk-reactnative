/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * NOTE: Do not import from '@apollo/client/utilities' as the package does not exist in Apollo Client < v3.
 */

import { version } from '@apollo/client/package.json';
import type { Operation } from '@apollo/client';
import { DdSdk } from '@datadog/mobile-react-native';
import type { DefinitionNode, OperationDefinitionNode } from 'graphql';
import { print } from 'graphql';

import { ErrorCode, errorMessages } from './types';

const apolloVersion = `[Apollo v${version}]`;

const GRAPHQL_PAYLOAD_LIMIT = 32 * 1024;

export const getVariables = (
    operation: Operation,
    trackVariables: boolean = false
): string | null => {
    if (operation.variables && trackVariables) {
        try {
            return JSON.stringify(operation.variables);
        } catch (e) {
            (DdSdk as any)?.telemetryError(
                _getErrorMessage(
                    ErrorCode.GQL_VARIABLE_RETRIEVAL_ERROR,
                    apolloVersion
                ),
                _getErrorStack(e),
                ErrorCode.GQL_VARIABLE_RETRIEVAL_ERROR
            );
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
        (DdSdk as any)?.telemetryError(
            _getErrorMessage(ErrorCode.GQL_OPERATION_TYPE_ERROR, apolloVersion),
            _getErrorStack(e),
            ErrorCode.GQL_OPERATION_TYPE_ERROR
        );
        return null;
    }
};

export const getPayload = (
    operation: Operation,
    trackPayload: boolean = false
): string | null => {
    if (!trackPayload) {
        return null;
    }

    try {
        const queryString = print(operation.query);
        const trimmedQuery = queryString.trim();

        return safeTruncate(trimmedQuery, GRAPHQL_PAYLOAD_LIMIT, '...');
    } catch (e) {
        (DdSdk as any)?.telemetryError(
            _getErrorMessage(
                ErrorCode.GQL_PAYLOAD_RETRIEVAL_ERROR,
                apolloVersion
            ),
            _getErrorStack(e),
            ErrorCode.GQL_PAYLOAD_RETRIEVAL_ERROR
        );
        return null;
    }
};

const _getErrorMessage = (code: ErrorCode, details: string) =>
    `${errorMessages[code]} - ${details}`;

const _getErrorStack = (error: unknown): string => {
    if (!error) {
        return '';
    }

    return error instanceof Error
        ? error.stack ?? 'No stack trace available'
        : `Non-Error thrown: ${error}`;
};

const safeTruncate = (candidate: string, length: number, suffix = '') => {
    const lastChar = candidate.charCodeAt(length - 1);
    const isLastCharSurrogatePair = lastChar >= 0xd800 && lastChar <= 0xdbff;
    const correctedLength = isLastCharSurrogatePair ? length + 1 : length;

    if (candidate.length <= correctedLength) {
        return candidate;
    }

    return `${candidate.slice(0, correctedLength)}${suffix}`;
};
