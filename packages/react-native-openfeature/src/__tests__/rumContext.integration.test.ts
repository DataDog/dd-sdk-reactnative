/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags } from '@datadog/mobile-react-native';
import { OpenFeature } from '@openfeature/web-sdk';

import { UserInfoSingleton } from '../../../core/src/sdk/UserInfoSingleton/UserInfoSingleton';
import NativeDdFlags from '../../../core/src/specs/NativeDdFlags';
import { DatadogOpenFeatureProvider } from '../provider';
import { enrichRumContext } from '../rumContext';

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

let testSequence = 0;

const setupProvider = async (context: Record<string, unknown>) => {
    testSequence += 1;
    const domain = `rum-context-domain-${testSequence}`;
    const clientName = `rum-context-client-${testSequence}`;

    await OpenFeature.setContext(domain, context);
    await OpenFeature.setProviderAndWait(
        domain,
        new DatadogOpenFeatureProvider({ clientName })
    );

    return { clientName, domain };
};

describe('explicit RUM context enrichment', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        UserInfoSingleton.reset();
        Object.assign(DdFlags, {
            isFeatureEnabled: false,
            clients: {}
        });
        await DdFlags.enable();
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
    });

    it('does not implicitly add the RUM user to provider context', async () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com'
        });

        const { clientName } = await setupProvider({});

        expect(NativeDdFlags.setEvaluationContext).toHaveBeenCalledWith(
            clientName,
            '',
            {}
        );
    });

    it('makes explicitly enriched context visible to OpenFeature and evaluation tracking', async () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { company_name: 'Example, Inc.' }
        });
        const enrichedContext = enrichRumContext({
            email: 'explicit@example.com'
        });

        const { clientName, domain } = await setupProvider(enrichedContext);
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        const expectedAttributes = {
            email: 'explicit@example.com',
            company_name: 'Example, Inc.'
        };
        expect(OpenFeature.getContext(domain)).toStrictEqual(enrichedContext);
        expect(NativeDdFlags.setEvaluationContext).toHaveBeenCalledWith(
            clientName,
            'rum-user',
            expectedAttributes
        );
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledWith(
            clientName,
            'test-flag',
            expect.any(Object),
            'rum-user',
            expectedAttributes
        );
    });

    it('uses the latest RUM user when the application reapplies its original context', async () => {
        const applicationContext = { region: 'us' };
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user-a',
            email: 'a@example.com'
        });
        const { clientName, domain } = await setupProvider(
            enrichRumContext(applicationContext)
        );

        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user-b',
            email: 'b@example.com',
            extraInfo: { plan: 'pro' }
        });
        await OpenFeature.setContext(
            domain,
            enrichRumContext(applicationContext)
        );
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        const expectedContext = {
            targetingKey: 'rum-user-b',
            email: 'b@example.com',
            plan: 'pro',
            region: 'us'
        };
        expect(OpenFeature.getContext(domain)).toStrictEqual(expectedContext);
        expect(NativeDdFlags.setEvaluationContext).toHaveBeenLastCalledWith(
            clientName,
            'rum-user-b',
            {
                email: 'b@example.com',
                plan: 'pro',
                region: 'us'
            }
        );
        expect(
            NativeDdFlags.trackEvaluation
        ).toHaveBeenLastCalledWith(
            clientName,
            'test-flag',
            expect.any(Object),
            'rum-user-b',
            { email: 'b@example.com', plan: 'pro', region: 'us' }
        );
        expect(applicationContext).toStrictEqual({ region: 'us' });
    });

    it('is independent of RUM feature flag evaluation tracking', async () => {
        await DdFlags.enable({ rumIntegrationEnabled: false });
        UserInfoSingleton.getInstance().setUserInfo({ id: 'rum-user' });

        const { clientName } = await setupProvider(enrichRumContext({}));

        expect(NativeDdFlags.setEvaluationContext).toHaveBeenLastCalledWith(
            clientName,
            'rum-user',
            {}
        );
    });

    it('uses undefined application fields as tombstones for RUM attributes', async () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: { plan: 'pro' }
        });

        const { clientName, domain } = await setupProvider(
            enrichRumContext({ email: undefined, plan: undefined })
        );
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        expect(OpenFeature.getContext(domain)).toStrictEqual({
            targetingKey: 'rum-user'
        });
        expect(NativeDdFlags.setEvaluationContext).toHaveBeenCalledWith(
            clientName,
            'rum-user',
            {}
        );
        expect(NativeDdFlags.trackEvaluation).toHaveBeenCalledWith(
            clientName,
            'test-flag',
            expect.any(Object),
            'rum-user',
            {}
        );
    });
});
