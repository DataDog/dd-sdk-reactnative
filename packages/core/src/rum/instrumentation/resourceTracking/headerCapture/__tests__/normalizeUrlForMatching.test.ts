/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    normalizeHostname,
    normalizeUrlForMatching
} from '../normalizeUrlForMatching';

describe('normalizeUrlForMatching', () => {
    it.each([
        [
            'HTTPS://API.Example.com/Public/Users?Q=A#Top',
            'https://api.example.com/Public/Users?Q=A#Top'
        ],
        ['https://API.example.com:8443', 'https://api.example.com:8443/'],
        ['https://API.example.com?Q=A', 'https://api.example.com/?Q=A'],
        ['https://API.example.com#Top', 'https://api.example.com/#Top'],
        ['https://api.example.com/v2', 'https://api.example.com/v2'],
        [
            'https://User:Pass@API.example.com/Path',
            'https://user:pass@api.example.com/Path'
        ]
    ])('lowercases only scheme and authority of %s', (url, expected) => {
        expect(normalizeUrlForMatching(url)).toBe(expected);
    });

    it.each([
        [
            'https://api.example.com/public/../private',
            'https://api.example.com/private'
        ],
        [
            'https://api.example.com/public/%2e%2e/private',
            'https://api.example.com/private'
        ],
        [
            'https://api.example.com/public/%2E./private',
            'https://api.example.com/private'
        ],
        [
            'https://api.example.com/v1/../v2/users',
            'https://api.example.com/v2/users'
        ],
        [
            'https://api.example.com/a/./b/%2e/c',
            'https://api.example.com/a/b/c'
        ],
        ['https://api.example.com/a/..', 'https://api.example.com/'],
        ['https://api.example.com/a/.', 'https://api.example.com/a/'],
        ['https://api.example.com/../../a', 'https://api.example.com/a'],
        [
            'https://api.example.com\\Path\\To',
            'https://api.example.com/Path/To'
        ],
        [
            'https://api.example.com/a/../b?x=/../y#/..',
            'https://api.example.com/b?x=/../y#/..'
        ],
        [
            'https://api.example.com/v1.2/file.json',
            'https://api.example.com/v1.2/file.json'
        ],
        [
            'https://api.example.com/a%20b/..c',
            'https://api.example.com/a%20b/..c'
        ]
    ])(
        'resolves dot segments and backslashes in the path of %s',
        (url, expected) => {
            expect(normalizeUrlForMatching(url)).toBe(expected);
        }
    );

    it.each([
        ['a tab', '\t'],
        ['a carriage return', '\r'],
        ['a line feed', '\n']
    ])('removes %s before resolving dot segments', (_, char) => {
        expect(
            normalizeUrlForMatching(
                `https://api.example.com/public/${char}../private`
            )
        ).toBe('https://api.example.com/private');
        expect(
            normalizeUrlForMatching(`https://api.exa${char}mple.com/v2`)
        ).toBe('https://api.example.com/v2');
    });

    it('trims leading and trailing control characters and spaces', () => {
        expect(
            normalizeUrlForMatching('  \u0000https://API.example.com/v2 \u001f')
        ).toBe('https://api.example.com/v2');
    });

    it.each([
        ['https://%61pi.example.com/v2', 'https://api.example.com/v2'],
        ['https://API.%45xample.com/V2', 'https://api.example.com/V2'],
        [
            'https://api%2Eexample%2ecom:8443/x',
            'https://api.example.com:8443/x'
        ],
        [
            'https://us%65r@%61pi.example.com/x',
            'https://us%65r@api.example.com/x'
        ],
        [
            'https://api.example.com%2f.evil/x',
            'https://api.example.com%2f.evil/x'
        ],
        [
            'https://api.example.com%40evil.test/x',
            'https://api.example.com%40evil.test/x'
        ],
        ['https://api.ex%zzample.com/x', 'https://api.ex%zzample.com/x']
    ])('decodes percent-encoded hostname characters in %s', (url, expected) => {
        expect(normalizeUrlForMatching(url)).toBe(expected);
    });

    it.each([
        [
            'https:///api.example.com/v2/users',
            'https://api.example.com/v2/users'
        ],
        ['https:////api.example.com/v2', 'https://api.example.com/v2'],
        ['https:\\\\api.example.com/v2', 'https://api.example.com/v2'],
        ['HTTPS:api.example.com/v2', 'https://api.example.com/v2'],
        ['http:/api.example.com', 'http://api.example.com/']
    ])('collapses the slashes after the scheme of %s', (url, expected) => {
        expect(normalizeUrlForMatching(url)).toBe(expected);
    });

    it.each([
        [
            'https://api\uFF0Eexample.com/v2/users',
            'https://api.example.com/v2/users'
        ],
        [
            'https://api%EF%BC%8Eexample.com/v2/users',
            'https://api.example.com/v2/users'
        ],
        ['https://api\u3002example\uFF61com/v2', 'https://api.example.com/v2'],
        [
            'https://\uFF41\uFF50\uFF49.example.com/v2',
            'https://api.example.com/v2'
        ],
        [
            'https://api\uFF0Eexample.com:8443/v2',
            'https://api.example.com:8443/v2'
        ],
        ['https://[::1]:8080/v2', 'https://[::1]:8080/v2']
    ])('maps Unicode hostname equivalents in %s', (url, expected) => {
        expect(normalizeUrlForMatching(url)).toBe(expected);
    });

    describe('normalizeHostname', () => {
        it.each([
            ['API.Example.com', 'api.example.com'],
            ['api\uFF0Eexample.com', 'api.example.com'],
            ['%61pi.example.com', 'api.example.com'],
            // Decoding must not introduce characters that change the host
            ['api.example.com%2fevil', 'api.example.com%2fevil'],
            ['api.example.com%E0%A4%A', 'api.example.com%e0%a4%a']
        ])('normalizes %s', (hostname, expected) => {
            expect(normalizeHostname(hostname)).toBe(expected);
        });
    });

    it('returns URLs without a scheme unchanged', () => {
        expect(normalizeUrlForMatching('/Relative/Path')).toBe(
            '/Relative/Path'
        );
    });
});
