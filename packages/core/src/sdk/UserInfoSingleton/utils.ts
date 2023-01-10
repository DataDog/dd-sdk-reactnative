/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RawUserInfo, UserInfo } from './types';

export const formatUserInfo = (rawUserInfo: RawUserInfo): UserInfo => {
    const { id, email, name, ...extraInfo } = rawUserInfo;
    return {
        id,
        email,
        name,
        extraInfo
    };
};
