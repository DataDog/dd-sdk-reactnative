/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PluginPassState } from '../types';

const PluginStateErrors = {
    ALREADY_INITIALIZED:
        'Plugin State already initialized, please use `getInstance`.'
} as const;

export class PluginState {
    static instance: PluginState | null = null;

    private pluginInitialized: Record<string, boolean> = {};

    private state: PluginPassState | null = null;

    private constructor() {
        if (PluginState.instance) {
            throw new Error(PluginStateErrors.ALREADY_INITIALIZED);
        }
        PluginState.instance = this;
    }

    static getInstance(state?: PluginPassState) {
        if (!PluginState.instance) {
            PluginState.instance = new PluginState();
        }

        if (state) {
            PluginState.instance['state'] = state;
        }

        return PluginState.instance;
    }

    private getPlatform() {
        return (
            ((this.state?.file?.opts?.caller as any)?.platform as string) ||
            'unknown'
        );
    }

    initialize() {
        const platform = this.getPlatform();
        this.pluginInitialized[platform] = true;
    }

    isInitialized() {
        const platform = this.getPlatform();
        return this.pluginInitialized[platform] || false;
    }
}
