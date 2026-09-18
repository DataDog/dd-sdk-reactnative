/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdFlags, DdSdkReactNative } from '@datadog/mobile-react-native';
import { InMemoryProvider, OpenFeature } from '@openfeature/web-sdk';

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

jest.mock('../../../core/src/specs/NativeDdSdk', () => ({
    __esModule: true,
    default: {
        setUserInfo: jest.fn(() => Promise.resolve()),
        clearUserInfo: jest.fn(() => Promise.resolve())
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
            extraInfo: {
                targetingKey: 'custom-user',
                name: 'custom-name',
                email: 'custom@example.com',
                company_name: 'Example, Inc.',
                nullable: null
            }
        });
        const enrichedContext = enrichRumContext({
            email: 'explicit@example.com'
        });

        const { clientName, domain } = await setupProvider(enrichedContext);
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        const expectedAttributes = {
            name: 'custom-name',
            email: 'explicit@example.com',
            company_name: 'Example, Inc.',
            nullable: null
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

    it('preserves the RUM targeting key through evaluation when a custom property throws', async () => {
        UserInfoSingleton.getInstance().setUserInfo({
            id: 'rum-user',
            email: 'rum@example.com',
            extraInfo: {
                get broken() {
                    throw new Error('cannot read custom property');
                }
            }
        });
        const { clientName, domain } = await setupProvider(
            enrichRumContext({ region: 'us' })
        );
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        const expectedAttributes = { email: 'rum@example.com', region: 'us' };
        expect(OpenFeature.getContext(domain)).toStrictEqual({
            targetingKey: 'rum-user',
            ...expectedAttributes
        });
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

    it('uses the anonymous subject after clearing the RUM user and reapplying application context', async () => {
        const applicationContext = { region: 'us' };
        await DdSdkReactNative.setUserInfo({
            id: 'rum-user',
            email: 'user@example.com',
            extraInfo: { plan: 'pro' }
        });
        const { clientName, domain } = await setupProvider(
            enrichRumContext(applicationContext)
        );

        await DdSdkReactNative.setUserInfo({ id: '' });
        expect(enrichRumContext(applicationContext)).toStrictEqual({
            targetingKey: 'rum-user',
            email: 'user@example.com',
            plan: 'pro',
            region: 'us'
        });

        await DdSdkReactNative.clearUserInfo();
        await OpenFeature.setContext(
            domain,
            enrichRumContext(applicationContext)
        );
        await OpenFeature.getClient(domain).getBooleanValue('test-flag', false);

        expect(OpenFeature.getContext(domain)).toStrictEqual(
            applicationContext
        );
        expect(
            NativeDdFlags.setEvaluationContext
        ).toHaveBeenLastCalledWith(clientName, '', { region: 'us' });
        expect(
            NativeDdFlags.trackEvaluation
        ).toHaveBeenLastCalledWith(
            clientName,
            'test-flag',
            expect.any(Object),
            '',
            { region: 'us' }
        );
    });

    it('isolates RUM login and logout updates from providers inheriting the global context', async () => {
        const globalContext = { region: 'shared-region' };
        await OpenFeature.setContext(globalContext);
        const otherProvider = Object.assign(new InMemoryProvider({}), {
            onContextChange: jest.fn(() => Promise.resolve())
        });
        await OpenFeature.setProviderAndWait('other-provider', otherProvider);

        const applicationContext = { region: 'datadog-region' };
        const { domain } = await setupProvider(
            enrichRumContext(applicationContext)
        );
        await DdSdkReactNative.setUserInfo({
            id: 'rum-user',
            email: 'user@example.com'
        });
        await OpenFeature.setContext(
            domain,
            enrichRumContext(applicationContext)
        );
        expect(OpenFeature.getContext(domain)).toStrictEqual({
            targetingKey: 'rum-user',
            email: 'user@example.com',
            region: 'datadog-region'
        });
        expect(
            OpenFeature.getClient(domain).getBooleanValue('test-flag', false)
        ).toBe(true);

        await DdSdkReactNative.clearUserInfo();
        await OpenFeature.setContext(
            domain,
            enrichRumContext(applicationContext)
        );
        expect(OpenFeature.getContext(domain)).toStrictEqual(
            applicationContext
        );
        expect(OpenFeature.getContext()).toStrictEqual(globalContext);
        expect(OpenFeature.getContext('other-provider')).toStrictEqual(
            globalContext
        );
        expect(otherProvider.onContextChange).not.toHaveBeenCalled();
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
