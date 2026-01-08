/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { ApolloLink } from '@apollo/client';
import {
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER,
    DATADOG_GRAPH_QL_PAYLOAD_HEADER,
    DATADOG_GRAPH_QL_ERROR_HEADER
} from '@datadog/mobile-react-native';

import {
    getOperationName,
    getVariables,
    getOperationType,
    getPayload
} from './helpers';

export type DatadogLinkOptions = {
    trackVariables?: boolean;
    trackPayload?: boolean;
    trackErrors?: boolean;
};

export class DatadogLink extends ApolloLink {
    private trackVariables = true;
    private trackPayload = false;
    private trackErrors = false;

    constructor(options: DatadogLinkOptions = {}) {
        super((operation, forward) => {
            const operationName = getOperationName(operation);
            const formattedVariables = getVariables(
                operation,
                this.trackVariables
            );
            const operationType = getOperationType(operation);
            const payload = getPayload(operation, this.trackPayload);

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

                if (formattedVariables) {
                    newHeaders[
                        DATADOG_GRAPH_QL_VARIABLES_HEADER
                    ] = formattedVariables;
                }

                if (payload) {
                    newHeaders[DATADOG_GRAPH_QL_PAYLOAD_HEADER] = payload;
                }

                newHeaders[DATADOG_GRAPH_QL_ERROR_HEADER] = this.trackErrors
                    ? 'true'
                    : 'false';

                return {
                    headers: newHeaders
                };
            });

            return forward(operation);
        });

        this.trackVariables = options.trackVariables ?? false;
        this.trackPayload = options.trackPayload ?? false;
        this.trackErrors = options.trackErrors ?? false;
    }
}
