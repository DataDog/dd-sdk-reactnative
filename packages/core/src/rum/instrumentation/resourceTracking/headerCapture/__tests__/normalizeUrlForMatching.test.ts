/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { normalizeUrlForMatching } from '../normalizeUrlForMatching';

describe('normalizeUrlForMatching', () => {
    it.each([
        [
            'HTTPS://API.Example.com/Public/Users?Q=A#Top',
            'https://api.example.com/Public/Users?Q=A#Top'
        ],
        ['https://API.example.com:8443', 'https://api.example.com:8443'],
        ['https://API.example.com?Q=A', 'https://api.example.com?Q=A'],
        ['https://API.example.com#Top', 'https://api.example.com#Top'],
        ['https://api.example.com/v2', 'https://api.example.com/v2'],
        ['https://API.example.com\\Path', 'https://api.example.com\\Path']
    ])('lowercases only scheme and authority of %s', (url, expected) => {
        expect(normalizeUrlForMatching(url)).toBe(expected);
    });

    it('returns URLs without a scheme unchanged', () => {
        expect(normalizeUrlForMatching('/Relative/Path')).toBe(
            '/Relative/Path'
        );
    });
});
