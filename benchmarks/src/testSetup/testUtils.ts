/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import queryString from 'query-string';
import {
    DatadogProviderConfiguration,
    DdSdkReactNative,
    DdSdkReactNativeConfiguration,
    SdkVerbosity,
    TrackingConsent
} from '@datadog/mobile-react-native';
import Config from 'react-native-config';
import BenchmarkVitals from '../specs/NativeBenchmarkVitals';
import { Command, RunType, Scenario } from './types/testConfig';
import type { DatadogConfig, NativeTestConfig, TestConfig } from './types/testConfig';
import { Platform } from 'react-native';

export const DEFAULT_ENV_TEST_CONFIG: TestConfig = {
    command: Command.Start,
    scenario: Config.BENCH_SCENARIO || undefined,
    runType: Config.BENCH_RUN_TYPE || RunType.BASELINE,
};

export const getDatadogConfig = (): DatadogConfig => {
    return {
        clientToken: Config.DD_CLIENT_TOKEN,
        applicationID: Config.DD_APP_ID,
        apiKey: Config.DD_API_KEY,
        site: Config.DD_SITE,
        env: Config.DD_ENV,
    };
};

export const getDatadogProviderConfig = () => {
    const platform = Platform.OS;
    let baseConfig = getDatadogConfig();
    let config = new DatadogProviderConfiguration(
        baseConfig.clientToken ?? '',
        baseConfig.env ?? '',
        baseConfig.applicationID ?? '',
        true,
        true,
        true,
        TrackingConsent.GRANTED
    );

    config.nativeCrashReportEnabled = true
    config.sessionSamplingRate = 100;
    config.serviceName = `com.rn.${platform}.benchmark`
    config.verbosity = SdkVerbosity.DEBUG;

    return config;
};

export const initializeDatadog = (clientToken?: string, environment?: string, appId?: string): Promise<void> =>  {
    const platform = Platform.OS;
    const config = new DdSdkReactNativeConfiguration(
        clientToken ?? '',
        environment ?? '',
        appId ?? '',
        true,
        true,
        true,
        TrackingConsent.GRANTED
    );
    config.nativeCrashReportEnabled = true
    config.sessionSamplingRate = 100;
    config.serviceName = `com.rn.${platform}.benchmark`
    config.verbosity = SdkVerbosity.DEBUG;

    return DdSdkReactNative.initialize(config);
};


export const getTestConfigFromDeeplink = (url: string): TestConfig | undefined => {
    try {
        const parsed = queryString.parseUrl(url);
        const command = parsed.url.split('://')[1];
        const scenario = parsed.query.scenario;
        const runType = parsed.query.runType;

        const testConfig: TestConfig = {
            command: command ? command as Command : undefined,
            scenario: scenario ? scenario as Scenario : Scenario.Default,
            runType: runType ? runType as RunType : RunType.BASELINE,
        }

        return testConfig;
    } catch( _error) {
        return undefined;
    };
};

export const startCollectingVitals = async (testConfig: TestConfig, datadogConfig: DatadogConfig) => {
    const nativeTestConfig: NativeTestConfig = {
        scenario: testConfig.scenario,
        runType: testConfig.runType,
        clientToken: datadogConfig.clientToken,
        applicationID: datadogConfig.applicationID,
        apiKey: datadogConfig.apiKey,
      };

    await BenchmarkVitals?.startCollectingVitals(nativeTestConfig);
};

export const stopCollectingVitals = async () => {
    await BenchmarkVitals?.stopCollectingVitals();
};

export const instrument = async (): Promise<void> => {
    const datadogConfig = getDatadogConfig();
    return initializeDatadog(datadogConfig.clientToken, datadogConfig.env, datadogConfig.applicationID);
};

export const isValidScenario = (scenario?: string): boolean => {
    return Object.values(Scenario).includes(scenario as Scenario);
};

export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};