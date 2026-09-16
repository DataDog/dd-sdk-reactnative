/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogOpenFeatureProvider, enrichRumContext } from '../index';

const mockFlagsClient = {
    setEvaluationContext: jest.fn(() => Promise.resolve())
};

jest.mock('@datadog/mobile-react-native', () => ({
    DdFlags: { getClient: jest.fn(() => mockFlagsClient) },
    configurationFromString: jest.fn()
}));

describe('RUM context core compatibility', () => {
    it('keeps the provider usable with a core version that predates enrichment', async () => {
        const provider = new DatadogOpenFeatureProvider();

        await provider.initialize({
            targetingKey: 'explicit-user',
            plan: 'pro'
        });

        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith({
            targetingKey: 'explicit-user',
            attributes: { plan: 'pro' }
        });
    });

    it('reports incompatible package versions when enrichment is requested', () => {
        expect(() => enrichRumContext({})).toThrow(
            'requires compatible versions of @datadog/mobile-react-native and @datadog/mobile-react-native-openfeature'
        );
    });
});
