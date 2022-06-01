/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { URLHostParser } from '../URLHostParser';

describe('URLHostParser', () => {
    it('returns the host when a classic URL is provided', () => {
        const url = 'https://api.example.com/api.json';
        expect(URLHostParser(url)).toBe('api.example.com');
    });
    it('returns the host when a port is provided', () => {
        const url = 'https://api.example.com:443/api.json';
        expect(URLHostParser(url)).toBe('api.example.com');
    });
    it('returns the host when no slash is present', () => {
        const url = 'https://api.example.com';
        expect(URLHostParser(url)).toBe('api.example.com');
    });
    it('strips whitespaces from host when there is a whitespace', () => {
        const url = 'https://api.example.com ';
        expect(URLHostParser(url)).toBe('api.example.com');
    });
    it('returns the host when a URL contains non ASCII characters', () => {
        const chineseURL = 'https://api.example.中国/api.json';
        expect(URLHostParser(chineseURL)).toBe('api.example.中国');

        const russianURL = 'https://api.example.рф/api.json';
        expect(URLHostParser(russianURL)).toBe('api.example.рф');

        const egyptianURL = 'https://api.example.مصر./api.json';
        expect(URLHostParser(egyptianURL)).toBe('api.example.مصر.');
    });
    it('returns null if not given an URL', () => {
        const url = 'crash';
        expect(URLHostParser(url)).toBeNull();
    });
});
