/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import type { RumAction } from '../constants';

export const MemoTypes = {
    USE_CALLBACK: 'useCallback',
    USE_MEMO: 'useMemo'
} as const;

export type MemoType = typeof MemoTypes[keyof typeof MemoTypes];

export type PluginAPI = typeof Babel & Babel.ConfigAPI;

export type TrackedComponent = {
    name: string;
    importSource: 'local' | string;
    handlers: {
        event: string;
        action: keyof typeof RumAction;
        mode?: 'default' | 'reanimated';
    }[];
};

export type IgnoredComponent = {
    name: string;
    importSource: string;
};

export type PluginOptions = {
    useComponentContent?: boolean;
    actionNameAttribute?: string;
    components?: {
        tracked: TrackedComponent[];
        ignored: IgnoredComponent[];
    };
};

export type PluginPassState = Babel.PluginPass & {
    fileInfo?: { path: string | null; name: string | null };
    memoization?: Record<string, string>;
    hasValidTapAction?: boolean;
    trackedComponents?: Record<
        string,
        Pick<TrackedComponent, 'importSource' | 'handlers'>
    >;
};

export type PluginResult = Babel.PluginObj<Babel.PluginPass>;
