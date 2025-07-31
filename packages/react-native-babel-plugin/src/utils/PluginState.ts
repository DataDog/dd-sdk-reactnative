/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const PluginStateErrors = {
    ALREADY_INITIALIZED:
        'Plugin State already initialized, please use `getInstance`.'
} as const;

export class PluginState {
    static instance: PluginState | null = null;

    isInitialized: boolean = false;

    private constructor() {
        if (PluginState.instance) {
            throw new Error(PluginStateErrors.ALREADY_INITIALIZED);
        }
        PluginState.instance = this;
    }

    static getInstance() {
        if (!PluginState.instance) {
            PluginState.instance = new PluginState();
        }

        return PluginState.instance;
    }
}
