/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { isDatadogCustomHeader } from '../../headers';
import {
    DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
    DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
    DATADOG_GRAPH_QL_VARIABLES_HEADER
} from '../graphqlHeaders';

describe('GraphQL custom headers', () => {
    it.each([
        DATADOG_GRAPH_QL_OPERATION_NAME_HEADER,
        DATADOG_GRAPH_QL_OPERATION_TYPE_HEADER,
        DATADOG_GRAPH_QL_VARIABLES_HEADER
    ])('%s matches the custom header pattern', header => {
        expect(isDatadogCustomHeader(header)).toBeTruthy();
    });
});
