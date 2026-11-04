/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import queryString from 'query-string';
import {
    DatadogProviderConfiguration,
    DdSdkReactNative,
    CoreConfiguration,
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
        TrackingConsent.GRANTED,
        {
            rumConfiguration: {
                applicationId: baseConfig.applicationID ?? '',
                trackInteractions: true,
                trackResources: true,
                trackErrors: true,
                sessionSampleRate: 100,
                nativeCrashReportEnabled: true
            },
            logsConfiguration: {
                bundleLogsWithRum: true,
                bundleLogsWithTraces: true,
            },
            traceConfiguration: {}
        }
    );
    config.service = `com.rn.${platform}.benchmark`
    config.verbosity = SdkVerbosity.DEBUG;

    return config;
};

export const initializeDatadog = (clientToken?: string, environment?: string, appId?: string): Promise<void> =>  {
    const platform = Platform.OS;
    const config = new CoreConfiguration(
        clientToken ?? '',
        environment ?? '',
        TrackingConsent.GRANTED,
        {
            rumConfiguration: {
                applicationId: appId ??  "",
                trackInteractions: true,
                trackResources: true,
                trackErrors: true,
                sessionSampleRate: 100,
                nativeCrashReportEnabled: true,
            },
            logsConfiguration: {
                bundleLogsWithRum: true,
                bundleLogsWithTraces: true,
            },
            traceConfiguration: {}
        }
    );
    config.service = `com.rn.${platform}.benchmark`
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
        env: datadogConfig.env,
      };

    await BenchmarkVitals?.startCollectingVitals(nativeTestConfig);
};

export const stopCollectingVitals = async () => {
    await BenchmarkVitals?.stopCollectingVitals();
};

/**
 * Reports the time from process start until now as the time to fully displayed (TTFD).
 *
 * It is measured natively, independently from the Datadog SDK, so that it is the same
 * for every run type. Resolves with the measured duration in milliseconds.
 */
export const reportFullyDisplayed = async (testConfig?: TestConfig): Promise<number | undefined> => {
    const datadogConfig = testConfig?.datadogConfig ?? getDatadogConfig();
    const nativeTestConfig: NativeTestConfig = {
        scenario: testConfig?.scenario,
        runType: testConfig?.runType,
        clientToken: datadogConfig.clientToken,
        applicationID: datadogConfig.applicationID,
        apiKey: datadogConfig.apiKey,
        env: datadogConfig.env,
    };

    return BenchmarkVitals?.reportFullyDisplayed(nativeTestConfig);
};

/**
 * Saves the cold start test config, to run it on the next launch of the app.
 *
 * The cold start scenario is measured from process start, so it can't be started by a deep link
 * opened in a running app: it is armed instead, and runs once the app is restarted.
 */
export const armColdStart = async (testConfig: TestConfig) => {
    await BenchmarkVitals?.armColdStart({
        scenario: testConfig.scenario,
        runType: testConfig.runType,
    });
};

/**
 * Returns the cold start test config armed before the app was restarted, if any.
 */
export const consumeColdStartConfig = async (): Promise<TestConfig | undefined> => {
    const config = (await BenchmarkVitals?.consumeColdStartConfig()) as
        | { scenario?: Scenario; runType?: RunType }
        | null
        | undefined;
    if (!config?.scenario) {
        return undefined;
    }

    return {
        command: Command.Start,
        scenario: config.scenario,
        runType: config.runType || RunType.BASELINE,
    };
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
