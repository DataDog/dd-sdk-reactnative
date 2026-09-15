/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RUMResource } from '../interfaces/RumResource';

const EXPO_DEV_LOGS_REGEX = new RegExp(
    '^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$'
);

const RN_PACKAGER_SYMBOLICATE_REGEX = new RegExp(
    '^http://localhost:808[0-9]/symbolicate$'
);

const internalDevResourceBlocklist: RegExp[] = [
    EXPO_DEV_LOGS_REGEX,
    RN_PACKAGER_SYMBOLICATE_REGEX
];

export const filterDevResource = (
    resource: RUMResource
): RUMResource | null => {
    if (__DEV__) {
        for (const resourceRegex of internalDevResourceBlocklist) {
            if (resourceRegex.test(resource.request.url)) {
                return null;
            }
        }
    }
    return resource;
};
