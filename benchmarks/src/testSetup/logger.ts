/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const Logger = {
    error: (message: string, context: Object) => {
        console.error(message, context);
    },
    warn:  (message: string, context: Object) => {
        console.warn(message, context);
    },
    info:  (message: string, context: Object) => {
        console.info(message, context);
    },
    debug:  (message: string, context: Object) => {
        console.log(message, context);
    }
};