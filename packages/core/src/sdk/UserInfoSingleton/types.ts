/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export type UserInfo = {
    readonly id?: string /** @deprecated To be made mandatory when removing DdSdkReactnative.setUser */;
    readonly name?: string;
    readonly email?: string;
    readonly extraInfo?: Record<string, unknown>;
    readonly [
        key: string
    ]: unknown /** @deprecated To be removed alongside DdSdkReactnative.setUser */;
};
