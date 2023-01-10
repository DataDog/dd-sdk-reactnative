/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export type UserInfo = {
    id?: string;
    name?: string;
    email?: string;
    extraInfo?: {
        [key: string]: unknown;
    };
};

export type RawUserInfo = {
    id?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
};
