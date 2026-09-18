/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../config/types/SdkVerbosity';
import { UserInfoSingleton } from '../sdk/UserInfoSingleton/UserInfoSingleton';
import type { UserInfo } from '../sdk/UserInfoSingleton/types';

type FlatEvaluationContext = Record<string, unknown> & {
    targetingKey?: string | undefined;
};

/**
 * Add the current RUM user to an OpenFeature-shaped evaluation context.
 *
 * @internal Used by the explicit helper in the Datadog OpenFeature package. This is a point-in-time
 * read; it does not synchronize OpenFeature when the RUM user changes. RUM values provide defaults;
 * fields explicitly supplied by the application remain authoritative. An explicitly undefined
 * field removes the corresponding RUM default and is omitted from the effective context.
 */
export const __ddEnrichEvaluationContextWithRumUser = (
    context: FlatEvaluationContext
): FlatEvaluationContext => {
    const effectiveContext = new Map(getRumContextEntries());

    try {
        for (const [key, value] of Object.entries(context)) {
            if (value === undefined) {
                effectiveContext.delete(key);
            } else {
                effectiveContext.set(key, value);
            }
        }

        return Object.fromEntries(effectiveContext);
    } catch (error) {
        InternalLog.log(
            `Could not read the application evaluation context (${errorMessage(
                error
            )}). Returning it unchanged, without the RUM user.`,
            SdkVerbosity.WARN
        );

        return context;
    }
};

const getRumContextEntries = (): Array<[string, unknown]> => {
    const user = readRumUser();
    if (!user) {
        return [];
    }

    const entries: Array<[string, unknown]> = [];

    // Isolate custom properties from the user's own fields: either group may invoke getters.
    try {
        for (const [key, value] of Object.entries(user.extraInfo ?? {})) {
            if (!isSupportedAttribute(value)) {
                InternalLog.log(
                    `RUM user property "${key}" is not a string, number, or boolean. Omitting it from the evaluation context.`,
                    SdkVerbosity.WARN
                );
                continue;
            }
            entries.push([key, value]);
        }
    } catch (error) {
        InternalLog.log(
            `Some RUM user properties could not be read (${errorMessage(
                error
            )}) and were not added to the evaluation context.`,
            SdkVerbosity.WARN
        );
    }

    try {
        // Read once so a getter cannot change the value between validation and insertion.
        const { name, email, id } = user;
        if (typeof name === 'string') {
            entries.push(['name', name]);
        }
        if (typeof email === 'string') {
            entries.push(['email', email]);
        }
        if (typeof id === 'string') {
            entries.push(['targetingKey', id]);
        }
    } catch (error) {
        InternalLog.log(
            `Some RUM user fields could not be read (${errorMessage(
                error
            )}) and were not added to the evaluation context.`,
            SdkVerbosity.WARN
        );
    }

    return entries;
};

const readRumUser = (): UserInfo | undefined => {
    let user: UserInfo | undefined;

    try {
        user = UserInfoSingleton.getInstance().getUserInfo();
    } catch (error) {
        InternalLog.log(
            `Could not read the RUM user (${errorMessage(
                error
            )}). No RUM values were added to the evaluation context.`,
            SdkVerbosity.WARN
        );

        return undefined;
    }

    if (!user) {
        InternalLog.log(
            'No RUM user is set, so no RUM values were added to the evaluation context. Call DdSdkReactNative.setUserInfo() and await it before enriching.',
            SdkVerbosity.WARN
        );
    }

    return user;
};

const errorMessage = (error: unknown): string => {
    try {
        // Both reading and coercing an application's error message can throw.
        return error instanceof Error ? String(error.message) : 'unknown error';
    } catch {
        return 'unknown error';
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
