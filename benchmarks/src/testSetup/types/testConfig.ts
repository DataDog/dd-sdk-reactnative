/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export enum Command {
    Start = 'start',
    Stop = 'stop',
}

export enum Scenario {
    Default = 'default',
    NavigationExample = 'navigation',
    LogsCustom = 'logsCustom',
    LogsHeavyTraffic = 'logsHeavyTraffic',
    Traces = 'traces',
    RUMManual = 'rumManual',
    RUMAuto = 'rumAuto',
    SessionReplay = 'sessionReplay'
    // Add new scenarios here
}

export enum RunType {
    BASELINE = 'baseline',
    INSTRUMENTED = 'instrumented',
    PROFILING ='profiling'
};

export interface TestConfig {
    command?: Command;
    scenario?: Scenario;
    runType?: RunType;
    datadogConfig?: DatadogConfig;
}

export interface DatadogConfig {
    clientToken?: string;
    applicationID?: string;
    apiKey?: string;
    site?: string;
    env?: string;
}

export interface NativeTestConfig {
    scenario?: Scenario;
    runType?: RunType;
    clientToken?: string;
    applicationID?: string;
    apiKey?: string;
}
