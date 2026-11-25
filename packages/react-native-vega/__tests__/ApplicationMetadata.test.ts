/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { version } from '@datadog/mobile-react-native/internal';

import { buildApplicationMetadata } from '../src/ApplicationMetadata';

const mockGet = jest.fn();
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

describe('Vega application metadata', () => {
    beforeEach(() => jest.resetAllMocks());
    it('reads app defaults and keeps the SDK version separate', () => {
        mockGet.mockReturnValue({
            getConstants: () => ({ bundleId: 'example.app', appVersion: '2.1' })
        });
        const result = buildApplicationMetadata({
            versionSuffix: 'beta',
            additionalConfiguration: { keep: true }
        });
        expect(mockGet).toHaveBeenCalledWith('DeviceInfoModule');
        expect(result.service).toBe('example.app');
        expect(result.version).toBe('2.1');
        expect(result.additionalConfiguration).toEqual({
            keep: true,
            '_dd.source': 'react-native',
            '_dd.sdk_version': version,
            '_dd.version': '2.1-beta'
        });
    });
    it('respects overrides without looking up platform metadata', () => {
        const input = Object.freeze({
            service: 'custom-service',
            version: '4.2',
            versionSuffix: 'preview',
            additionalConfiguration: Object.freeze({
                '_dd.version': 'stale',
                '_dd.version_suffix': '-stale'
            })
        });
        const first = buildApplicationMetadata(input);
        const second = buildApplicationMetadata(first);
        expect(mockGet).not.toHaveBeenCalled();
        expect(second.service).toBe('custom-service');
        expect(second.additionalConfiguration['_dd.version']).toBe(
            '4.2-preview'
        );
        expect(
            second.additionalConfiguration['_dd.version_suffix']
        ).toBeUndefined();
        expect(input.additionalConfiguration['_dd.version']).toBe('stale');
    });
    it.each([
        null,
        {},
        {
            getConstants: () => ({ bundleId: 'unknown', appVersion: 'unknown' })
        },
        { getConstants: () => ({ bundleId: ' ', appVersion: 42 }) },
        {
            getConstants: () => {
                throw Error('unavailable');
            }
        }
    ])(
        'keeps setup usable when platform details are unavailable: %p',
        native => {
            mockGet.mockReturnValue(native);
            const result = buildApplicationMetadata({});
            expect(result.service).toBe('vega');
            expect(result.version).toBeUndefined();
            expect(
                result.additionalConfiguration['_dd.version']
            ).toBeUndefined();
            expect(result.additionalConfiguration['_dd.sdk_version']).toBe(
                version
            );
        }
    );
    it('keeps explicit values when a platform lookup fails', () => {
        mockGet.mockImplementation(() => {
            throw Error('lookup');
        });
        const result = buildApplicationMetadata({
            service: 'custom',
            versionSuffix: 'beta'
        });
        expect(result.service).toBe('custom');
        expect(result.version).toBeUndefined();
        expect(result.additionalConfiguration['_dd.version_suffix']).toBe(
            '-beta'
        );
    });
});
