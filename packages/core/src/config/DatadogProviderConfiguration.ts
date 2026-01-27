/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { CoreConfiguration } from './features/CoreConfiguration';
import { InitializationMode } from './types';

/**
 * SDK Initialization configuration for `DatadogProvider`.
 */
export class DatadogProviderConfiguration extends CoreConfiguration {
    /**
     * If set to ASYNC, the initialization will be delayed until all animations are completed.
     */
    public initializationMode: InitializationMode = InitializationMode.SYNC;
}
