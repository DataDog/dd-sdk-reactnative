/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RUMResource } from '../../interfaces/RumResource';

/**
 * Expo sends all console.* calls to the packager. As we log all API calls
 * when the SDKVerbosity is DEBUG, this would result in an infinite loop of
 * `console.log` and API calls, creating 250 RUM resources per second.
 *
 * The hostname is always going to be localhost or a local IP.
 *
 * An example URL is http://192.168.1.20:8081/logs or http://10.46.29.155:19000/logs
 */
const EXPO_DEV_LOGS_REGEX = new RegExp(
    '^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost):[0-9]+/logs$'
);

/**
 * This call is made every time the RN packager reloads the js in dev mode.
 */
const RN_PACKAGER_SYMBOLICATE_REGEX = new RegExp(
    '^http://localhost:[0-9]+/symbolicate$'
);

const internalResourceBlocklist: RegExp[] = [
    EXPO_DEV_LOGS_REGEX,
    RN_PACKAGER_SYMBOLICATE_REGEX
];

/**
 * Filters RN symbolicate calls and Expo logs calls that happen only in dev.
 * @param resource RUMResource
 */
export const filterDevResource = (
    resource: RUMResource
): RUMResource | null => {
    // TODO: if we get the confirmation by Expo that the
    // logs call is only made when __DEV__ is true, add an
    // early return for when it is false.
    for (const resourceRegex of internalResourceBlocklist) {
        if (resourceRegex.test(resource.request.url)) {
            return null;
        }
    }
    return resource;
};
