/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

export const MemoTypes = {
    USE_CALLBACK: 'useCallback',
    USE_MEMO: 'useMemo'
} as const;

export type MemoType = typeof MemoTypes[keyof typeof MemoTypes];

export type PluginAPI = typeof Babel & Babel.ConfigAPI;

export type PluginOptions = {
    actionNameAttribute: string;
};

export type PluginPassState = Babel.PluginPass & {
    pluginInitialiazed?: boolean;
    fileInfo?: { path: string | null; name: string | null };
    tapMappings?: Record<string, string[]>;
    memoization?: Record<string, string>;
    hasValidTapAction?: boolean;
};

export type PluginResult = Babel.PluginObj<Babel.PluginPass>;
