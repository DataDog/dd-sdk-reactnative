/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const PluginConstants = {
    PLUGIN_ENABLED: '__DD_RN_BABEL_PLUGIN_ENABLED__'
} as const;

export const defaultPluginOptions = {
    components: {
        useContent: true,
        useNamePrefix: true,
        tracked: []
    }
};
