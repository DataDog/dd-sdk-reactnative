/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags } from '@datadog/mobile-react-native';

import { UserInfoSingleton } from '../../../core/src/sdk/UserInfoSingleton/UserInfoSingleton';
import NativeDdFlags from '../../../core/src/specs/NativeDdFlags';
import { DatadogOpenFeatureProvider } from '../provider';

jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() =>
            Promise.resolve({
                'test-flag': {
                    key: 'test-flag',
                    value: true,
                    allocationKey: 'allocation',
                    variationKey: 'enabled',
                    reason: 'TARGETING_MATCH',
                    doLog: true,
                    variationType: 'boolean',
                    variationValue: 'true',
                    extraLogging: {}
                }
            })
        ),
        trackEvaluation: jest.fn(() => Promise.resolve())
    }
}));

describe('DatadogOpenFeatureProvider RUM user integration', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        UserInfoSingleton.reset();
        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });
        await DdFlags.enable();
    });

    it('uses the same enriched context for fetching and evaluation tracking', async () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { company_name: 'Example, Inc.' }
        });
        const provider = new DatadogOpenFeatureProvider({
            clientName: 'rum-integration'
        });

        await provider.initialize({ email: 'explicit@example.com' });
        provider.resolveBooleanEvaluation(
            'test-flag',
            false,
            {},
            // eslint-disable-next-line no-console
            console as never
        );

        const expectedAttributes = {
            email: 'explicit@example.com',
            company_name: 'Example, Inc.'
        };
        expect(NativeDdFlags.setEvaluationContext).toHaveBeenCalledWith(
            'rum-integration',
            'rum-user',
            expectedAttributes
        );
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledWith(
            'rum-integration',
            'test-flag',
            expect.any(Object),
            'rum-user',
            expectedAttributes
        );
    });

    it('does not enrich the context when RUM integration is disabled', async () => {
        await DdFlags.enable({ rumIntegrationEnabled: false });
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user' });
        const provider = new DatadogOpenFeatureProvider({
            clientName: 'rum-disabled'
        });

        await provider.initialize({});

        expect(NativeDdFlags.setEvaluationContext).toHaveBeenCalledWith(
            'rum-disabled',
            '',
            {}
        );
    });

    it('uses the latest RUM user after context reconciliation', async () => {
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user-a' });
        const provider = new DatadogOpenFeatureProvider({
            clientName: 'rum-refresh'
        });
        await provider.initialize({});

        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user-b',
            extraInfo: { plan: 'pro' }
        });
        await provider.onContextChange({}, {});
        provider.resolveBooleanEvaluation(
            'test-flag',
            false,
            {},
            // eslint-disable-next-line no-console
            console as never
        );

        expect(NativeDdFlags.setEvaluationContext).toHaveBeenLastCalledWith(
            'rum-refresh',
            'rum-user-b',
            {
                plan: 'pro'
            }
        );
        expect(
            NativeDdFlags.trackEvaluation
        ).toHaveBeenLastCalledWith(
            'rum-refresh',
            'test-flag',
            expect.any(Object),
            'rum-user-b',
            { plan: 'pro' }
        );
    });
});
