/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { validateFlagSelection } from '../flagSelection';

describe('validateFlagSelection', () => {
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['an empty object', {}],
        ['null lists', { tags: null, keyPatterns: null }]
    ])('returns no selection for %s', (_, input) => {
        expect(validateFlagSelection(input)).toEqual({ kind: 'none' });
    });

    it('returns both lists unchanged', () => {
        expect(
            validateFlagSelection({
                tags: ['b', ' a ', 'b', ''],
                keyPatterns: ['checkout-*']
            })
        ).toEqual({
            kind: 'selected',
            selection: {
                tags: ['b', ' a ', 'b', ''],
                keyPatterns: ['checkout-*']
            }
        });
    });

    it('returns empty lists unchanged', () => {
        expect(validateFlagSelection({ tags: [], keyPatterns: [] })).toEqual({
            kind: 'selected',
            selection: { tags: [], keyPatterns: [] }
        });
    });

    it('omits a list that is null or absent', () => {
        expect(
            validateFlagSelection({
                tags: ['team:checkout'],
                keyPatterns: null
            })
        ).toEqual({
            kind: 'selected',
            selection: { tags: ['team:checkout'] }
        });
    });

    it('ignores properties other than tags and keyPatterns', () => {
        expect(
            validateFlagSelection({ tags: ['team:checkout'], other: 42 })
        ).toEqual({
            kind: 'selected',
            selection: { tags: ['team:checkout'] }
        });
    });

    it('accepts well-formed surrogate pairs', () => {
        expect(validateFlagSelection({ tags: ['team:😀'] })).toEqual({
            kind: 'selected',
            selection: { tags: ['team:😀'] }
        });
    });

    it.each([
        ['a string', 'team:checkout'],
        ['a number', 42],
        ['a boolean', true],
        ['an array', ['team:checkout']],
        ['a function', () => ({ tags: ['team:checkout'] })],
        ['a string tags list', { tags: 'team:checkout' }],
        ['an object keyPatterns list', { keyPatterns: { 0: 'checkout-*' } }],
        ['a number element', { tags: ['team:checkout', 42] }],
        ['a null element', { keyPatterns: [null] }],
        ['an undefined element', { tags: [undefined] }],
        // eslint-disable-next-line no-sparse-arrays
        ['a hole', { tags: ['team:checkout', , 'team:cart'] }],
        ['an array element', { tags: [['team:checkout']] }],
        ['a lone high surrogate', { tags: ['team:\uD83D'] }],
        ['a lone low surrogate', { keyPatterns: ['\uDE00-checkout'] }],
        ['reversed surrogates', { tags: ['\uDE00\uD83D'] }],
        ['a lone surrogate in a later element', { tags: ['ok', 'a\uDBFFb'] }]
    ])('reports %s as malformed', (_, input) => {
        expect(validateFlagSelection(input)).toEqual({ kind: 'malformed' });
    });

    it('reports a selection as malformed when reading it throws', () => {
        const throwingGetter = {
            get keyPatterns(): string[] {
                throw new Error('getter failure');
            }
        };
        const throwingProxy = new Proxy(['team:checkout'], {
            get: () => {
                throw new Error('proxy failure');
            }
        });

        expect(validateFlagSelection(throwingGetter)).toEqual({
            kind: 'malformed'
        });
        expect(validateFlagSelection({ tags: throwingProxy })).toEqual({
            kind: 'malformed'
        });
    });

    it('returns copies of the lists', () => {
        const tags = ['team:checkout'];

        const result = validateFlagSelection({ tags });
        tags.push('team:cart');

        expect(result).toEqual({
            kind: 'selected',
            selection: { tags: ['team:checkout'] }
        });
    });
});
