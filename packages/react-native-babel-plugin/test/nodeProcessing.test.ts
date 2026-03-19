/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0. This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as Babel from '@babel/core';

import { getNodeName } from '../src/utils/nodeProcessing';

const t = Babel.types;

describe('getNodeName', () => {
    it('should return the string as-is when given a string', () => {
        expect(getNodeName(t, 'View')).toBe('View');
    });

    it('should return the name of a JSXIdentifier', () => {
        const node = t.jsxIdentifier('Text');
        expect(getNodeName(t, node)).toBe('Text');
    });

    it('should return dotted name for a JSXMemberExpression', () => {
        const node = t.jsxMemberExpression(
            t.jsxIdentifier('Card'),
            t.jsxIdentifier('Title')
        );
        expect(getNodeName(t, node)).toBe('Card.Title');
    });

    it('should return dotted name for a deeply nested JSXMemberExpression', () => {
        const node = t.jsxMemberExpression(
            t.jsxMemberExpression(t.jsxIdentifier('A'), t.jsxIdentifier('B')),
            t.jsxIdentifier('C')
        );
        expect(getNodeName(t, node)).toBe('A.B.C');
    });

    it('should return null for a node without a name property', () => {
        const node = t.numericLiteral(42);
        expect(getNodeName(t, node)).toBeNull();
    });

    it('should return null for an empty statement node', () => {
        const node = t.emptyStatement();
        expect(getNodeName(t, node)).toBeNull();
    });
});
