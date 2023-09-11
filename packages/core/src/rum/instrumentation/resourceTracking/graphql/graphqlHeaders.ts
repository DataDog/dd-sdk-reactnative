/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const DATADOG_CUSTOM_HEADER_PREFIX = '_dd-custom-header';

export const DATADOG_GRAPH_QL_OPERATION_NAME_HEADER = `${DATADOG_CUSTOM_HEADER_PREFIX}-graph-ql-operation-name`;
export const DATADOG_GRAPH_QL_VARIABLES_HEADER = `${DATADOG_CUSTOM_HEADER_PREFIX}-graph-ql-variables`;
export const DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER = `${DATADOG_CUSTOM_HEADER_PREFIX}-graph-ql-operation-type`;

export const isDatadogCustomHeader = (header: string) => {
    return header.match(new RegExp(`^${DATADOG_CUSTOM_HEADER_PREFIX}`));
};
