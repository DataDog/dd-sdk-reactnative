/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

export type BabelTypes = typeof Babel.types;

export type AssignmentNode =
    | Babel.types.Identifier
    | Babel.types.StringLiteral
    | Babel.types.NumericLiteral
    | Babel.types.NullLiteral
    | Babel.types.BooleanLiteral
    | Babel.types.RegExpLiteral
    | Babel.types.ObjectExpression
    | Babel.types.ArrayExpression;
