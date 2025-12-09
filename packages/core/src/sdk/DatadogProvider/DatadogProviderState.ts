/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { getGlobalInstance } from '../../utils/singletonUtils';

const DATADOG_PROVIDER_STATE_MODULE =
    'com.datadog.reactnative.rum.datadog_provider_state';

class _DatadogProviderState {
    private _isInitialized: boolean = false;

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    setInitialized() {
        this._isInitialized = true;
    }

    _reset() {
        this._isInitialized = false;
    }
}

export const DatadogProviderState = getGlobalInstance(
    DATADOG_PROVIDER_STATE_MODULE,
    () => new _DatadogProviderState()
);
