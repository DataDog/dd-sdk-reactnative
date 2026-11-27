/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdAttributes, debugId } from '@datadog/mobile-react-native/internal';

export const errorContext = (context: object): Record<string, unknown> => ({
    ...context,
    [DdAttributes.errorSourceType]: 'react-native',
    ...(typeof debugId === 'string' && debugId
        ? { [DdAttributes.debugId]: debugId }
        : {})
});
