/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';

/**
 * Validates the given context before passing it to the native SDKs.
 * @param context the original context
 * @returns the original context if it's a plain object, an object wrapping the context if it's an array,
 *          or an empty object if the context is of any other type.
 */
export const validateContext = (context: any) => {
    if (!context) {
        return {};
    }

    // eslint-disable-next-line eqeqeq
    if (context.constructor == Object) {
        return context;
    }

    if (Array.isArray(context)) {
        InternalLog.log(
            "The given context is an array, it will be nested in 'context' property inside a new object.",
            SdkVerbosity.WARN
        );
        return { context };
    }

    InternalLog.log(
        `The given context (${context}) is invalid - it must be an object. Context will be empty.`,
        SdkVerbosity.ERROR
    );

    return {};
};
