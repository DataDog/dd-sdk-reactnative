/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getGlobalInstance } from '../../utils/singletonUtils';

const GLOBAL_STATE_MODULE = 'com.datadog.reactnative.sdk.global_state';

/**
 * A singleton container for attributes that are shared internally across all
 * the SDK classes.
 */
class _GlobalState {
    /**
     * `true` if the SDK is initialized, `false` otherwise.
     */
    public isInitialized = false;
}

export const GlobalState = getGlobalInstance(
    GLOBAL_STATE_MODULE,
    () => new _GlobalState()
);
