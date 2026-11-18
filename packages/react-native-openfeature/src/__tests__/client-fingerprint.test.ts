/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { SUPPORTED_FLAGS_CAPABILITIES } from '@datadog/flagging-core';

import packageJson from '../../package.json';
import { getClientFingerprint } from '../client-fingerprint';
import type { ClientFingerprint } from '../client-fingerprint';

jest.mock('@datadog/flagging-core', () => ({
    ...jest.requireActual('@datadog/flagging-core'),
    SUPPORTED_FLAGS_CAPABILITIES: ['z-test-capability', 'a-test-capability']
}));

describe('getClientFingerprint', () => {
    it('describes the React Native SDK and its decoder capabilities', () => {
        const fingerprint: ClientFingerprint = getClientFingerprint();
        expect(JSON.parse(fingerprint)).toEqual({
            version: 1,
            sdk: { name: 'react-native', version: packageJson.version },
            capabilities: [...SUPPORTED_FLAGS_CAPABILITIES].sort()
        });
        expect(getClientFingerprint()).toBe(fingerprint);
    });

    it('sorts a multi-capability list without mutating the shared source', () => {
        expect(JSON.parse(getClientFingerprint()).capabilities).toEqual([
            'a-test-capability',
            'z-test-capability'
        ]);
        expect(SUPPORTED_FLAGS_CAPABILITIES).toEqual([
            'z-test-capability',
            'a-test-capability'
        ]);
    });
});
