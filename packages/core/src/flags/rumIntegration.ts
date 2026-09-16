/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';

type FlatEvaluationContext = Record<string, unknown> & {
    targetingKey?: string;
};

/**
 * Add the current RUM user to an OpenFeature-shaped evaluation context.
 *
 * @internal Used by the explicit helper in the Datadog OpenFeature package. This is a point-in-time
 * read; it does not synchronize OpenFeature when the RUM user changes. RUM values provide defaults;
 * fields explicitly supplied by the application remain authoritative. An explicitly undefined
 * field removes the corresponding RUM default and is omitted from the effective context.
 */
export const enrichEvaluationContextWithRumUser = <
    T extends FlatEvaluationContext
>(
    context: T
): T => {
    const effectiveContext = new Map(getRumContextEntries());

    try {
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

const getRumContextEntries = (): Array<[string, unknown]> => {
    try {
        const user = UserInfoSingleton.getInstance().getUserInfo();
        if (!user) {
            return [];
        }

        const entries: Array<[string, unknown]> = [];

        for (const [key, value] of Object.entries(user.extraInfo ?? {})) {
            if (isSupportedAttribute(value)) {
                entries.push([key, value]);
            }
        }

        if (typeof user.name === 'string') {
            entries.push(['name', user.name]);
        }
        if (typeof user.email === 'string') {
            entries.push(['email', user.email]);
        }
        if (typeof user.id === 'string') {
            entries.push(['targetingKey', user.id]);
        }

        return entries;
    } catch {
        return [];
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
