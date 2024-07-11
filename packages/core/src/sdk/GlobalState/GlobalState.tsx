/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A singleton container for attributes that are shared internally across all
 * the SDK classes.
 */
export class GlobalState {
    /**
     * `true` if the SDK is initialized, `false` otherwise.
     */
    public isInitialized = false;

    // Singleton implementation
    private static _instance: GlobalState | undefined = undefined;
    public static get instance(): GlobalState {
        if (this._instance === undefined) {
            this._instance = new GlobalState();
        }

        return this._instance;
    }
}
