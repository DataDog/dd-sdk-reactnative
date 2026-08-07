/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DatadogOpenFeatureProvider } from '../provider';

const mockFlagsClient = {
    setEvaluationContext: jest.fn(() => Promise.resolve())
};

jest.mock('@datadog/mobile-react-native', () => ({
    DdFlags: { getClient: jest.fn(() => mockFlagsClient) },
    configurationFromString: jest.fn()
}));

describe('DatadogOpenFeatureProvider core compatibility', () => {
    it('preserves context when the installed core does not expose the RUM enricher', async () => {
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
});
