/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';

type FlatEvaluationContext = Record<string, unknown> & {
    targetingKey?: string;
};

let rumIntegrationEnabled = true;

/** @internal Keep the JS integration state aligned with the native Flags configuration. */
export const setRumIntegrationEnabled = (enabled: boolean): void => {
    rumIntegrationEnabled = enabled;
};

/**
 * Add the current RUM user to an OpenFeature-shaped evaluation context.
 *
 * @internal Shared with the Datadog OpenFeature package. RUM values provide defaults; fields
 * explicitly supplied by the application remain authoritative. An explicitly undefined field
 * removes the corresponding RUM default and is omitted from the effective context.
 */
export const enrichEvaluationContextWithRumUser = <
    T extends FlatEvaluationContext
>(
    context: T
): T => {
    try {
        if (!rumIntegrationEnabled) {
            return context;
        }

        const user = UserInfoSingleton.getInstance().getUserInfo();
        if (!user) {
            return context;
        }

        const rumContextEntries: Array<[string, unknown]> = [];

        for (const [key, value] of Object.entries(user.extraInfo ?? {})) {
            if (isSupportedAttribute(value)) {
                rumContextEntries.push([key, value]);
            }
        }

        if (typeof user.name === 'string') {
            rumContextEntries.push(['name', user.name]);
        }
        if (typeof user.email === 'string') {
            rumContextEntries.push(['email', user.email]);
        }
        if (typeof user.id === 'string') {
            rumContextEntries.push(['targetingKey', user.id]);
        }

        const effectiveContext = new Map(rumContextEntries);
        for (const [key, value] of Object.entries(context)) {
            if (value === undefined) {
                effectiveContext.delete(key);
            } else {
                effectiveContext.set(key, value);
            }
        }

        return Object.fromEntries(effectiveContext) as T;
    } catch {
        return context;
    }
};

const isSupportedAttribute = (
    value: unknown
): value is string | number | boolean => {
    return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
};
