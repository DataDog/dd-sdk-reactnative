/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ApolloLink } from '@apollo/client';

import { getOperationName, getVariables, getOperationType } from './helpers';

export class DatadogLink extends ApolloLink {
    constructor() {
        super((operation, forward) => {
            const operationName = getOperationName(operation);
            const formattedVariables = getVariables(operation);
            const operationType = getOperationType(operation);

            operation.setContext(({ headers = {} }) => {
                return {
                    headers: {
                        ...headers,
                        // TODO: import headers from core
                        '_dd-graph-ql-operation-name': operationName,
                        '_dd-graph-ql-variables': formattedVariables,
                        '_dd-graph-ql-operation-type': operationType
                    }
                };
            });

            return forward(operation);
        });
    }
}
