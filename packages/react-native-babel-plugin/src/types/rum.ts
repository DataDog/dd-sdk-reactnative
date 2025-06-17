/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

export type RumActionResult = {
    parentNode: Babel.types.JSXAttribute;
    parentName: string;
    propertyNode: Babel.types.JSXAttribute;
    propertyName: string;
    expression: any;
};
