/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import { OpenFeature } from '@openfeature/web-sdk';

import { DatadogCoreProvider } from '../rules-based';
import {
    createDatadogExposureLoggingHook,
    createDatadogEvaluationLoggingHook,
    createDatadogRumTrackingHook
} from '../tracking';

import {
    matchingContext,
    precomputedConfiguration
} from './__utils__/coreConfiguration';

jest.mock('@datadog/mobile-react-native', () => ({ __esModule: true }));

describe('tracking hook core compatibility', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(async () => {
        await OpenFeature.clearProviders();
        await OpenFeature.clearContext();
        jest.restoreAllMocks();
        Reflect.deleteProperty(DatadogSdk, '__ddTrackFlagExposure');
        Reflect.deleteProperty(DatadogSdk, '__ddTrackFlagEvaluationEvent');
        Reflect.deleteProperty(DatadogSdk, '__ddTrackFlagRumEvaluation');
    });

    it.each([
        [createDatadogExposureLoggingHook, '__ddTrackFlagExposure'],
        [createDatadogEvaluationLoggingHook, '__ddTrackFlagEvaluationEvent'],
        [createDatadogRumTrackingHook, '__ddTrackFlagRumEvaluation']
    ] as const)(
        'warns once and leaves evaluation working when %s is unavailable',
        async (create, method) => {
            const tracking = create();
            const provider = new DatadogCoreProvider();
            provider.setConfiguration(precomputedConfiguration());
            await OpenFeature.setProviderAndWait(provider, matchingContext);
            const client = OpenFeature.getClient();
            client.addHooks(...tracking.hooks);

            await tracking.initialize();
            await tracking.initialize();
            for (let i = 0; i < 10; i++) {
                expect(client.getBooleanValue('boolean-flag', false)).toBe(
                    true
                );
            }
            await tracking.shutdown();
            await tracking.initialize();
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining(method)
            );

            const record = jest.fn();
            Object.assign(DatadogSdk, { [method]: record });
            await tracking.initialize();
            expect(client.getBooleanValue('boolean-flag', false)).toBe(true);
            expect(record).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );
});
