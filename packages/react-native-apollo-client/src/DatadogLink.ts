/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ApolloLink } from '@apollo/client';
import {
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from '@datadog/mobile-react-native';

import { getOperationName, getVariables, getOperationType } from './helpers';

export class DatadogLink extends ApolloLink {
    constructor() {
        super((operation, forward) => {
            const operationName = getOperationName(operation);
            const formattedVariables = getVariables(operation);
            const operationType = getOperationType(operation);

            operation.setContext(({ headers = {} }) => {
                const newHeaders: Record<string, string | null> = {
                    ...headers
                };

                newHeaders[
                    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER
                ] = operationType;
                newHeaders[
                    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER
                ] = operationName;
                newHeaders[
                    DATADOG_GRAPH_QL_VARIABLES_HEADER
                ] = formattedVariables;

                return {
                    headers: newHeaders
                };
            });

            return forward(operation);
        });
    }
}
