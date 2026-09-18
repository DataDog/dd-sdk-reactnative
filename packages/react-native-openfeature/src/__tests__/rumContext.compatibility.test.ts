/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import { OpenFeature } from '@openfeature/web-sdk';

import { DatadogOpenFeatureProvider, enrichWithRumUser } from '../index';

const mockFlagsClient = {
    setEvaluationContext: jest.fn(() => Promise.resolve()),
    getBooleanDetails: jest.fn(() => ({
        value: true,
        reason: 'TARGETING_MATCH',
        variant: 'enabled'
    }))
};

jest.mock('@datadog/mobile-react-native', () => ({
    __esModule: true,
    DdFlags: { getClient: jest.fn(() => mockFlagsClient) },
    configurationFromString: jest.fn()
}));

describe('RUM context core compatibility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Reflect.deleteProperty(
            DatadogSdk,
            '__ddEnrichEvaluationContextWithRumUser'
        );
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
        jest.restoreAllMocks();
    });
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

    it('returns the context unchanged and warns when the helper and InternalLog are missing', () => {
        const context = Object.freeze({
            targetingKey: 'application-user',
            email: undefined,
            profile: { plan: 'pro' }
        });

        expect(DatadogSdk.InternalLog).toBeUndefined();
        expect(enrichWithRumUser(context)).toBe(context);
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenCalledWith(
            'DATADOG: `enrichWithRumUser` could not access the core RUM enrichment helper. Returning the application context unchanged. Check SDK compatibility.'
        );
    });

    it.each([undefined, null, false, 42, 'not a function', {}])(
        'returns the context unchanged when the helper is not callable (%p)',
        enricher => {
            Object.assign(DatadogSdk, {
                __ddEnrichEvaluationContextWithRumUser: enricher
            });
            const context = { targetingKey: 'application-user', plan: 'pro' };

            expect(enrichWithRumUser(context)).toBe(context);
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );

    it('allows OpenFeature startup and flag evaluation with the application context', async () => {
        const context = {
            targetingKey: 'application-user',
            plan: 'pro',
            email: undefined
        };

        await OpenFeature.setContext(enrichWithRumUser(context));
        await OpenFeature.setProviderAndWait(new DatadogOpenFeatureProvider());

        expect(OpenFeature.getContext()).toStrictEqual(context);
        expect(mockFlagsClient.setEvaluationContext).toHaveBeenCalledWith({
            targetingKey: 'application-user',
            attributes: { plan: 'pro', email: undefined }
        });
        expect(
            OpenFeature.getClient().getBooleanValue('test-flag', false)
        ).toBe(true);
        expect(mockFlagsClient.getBooleanDetails).toHaveBeenCalledWith(
            'test-flag',
            false
        );
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('delegates to an available helper without warning', () => {
        const context = { region: 'us' };
        const enriched = { targetingKey: 'rum-user', region: 'us' };
        const enricher = jest.fn(() => enriched);
        Object.assign(DatadogSdk, {
            __ddEnrichEvaluationContextWithRumUser: enricher
        });

        expect(enrichWithRumUser(context)).toBe(enriched);
        expect(enricher).toHaveBeenCalledWith(context);
        expect(enricher).toHaveBeenCalledTimes(1);
        expect(console.warn).not.toHaveBeenCalled();
    });
});
