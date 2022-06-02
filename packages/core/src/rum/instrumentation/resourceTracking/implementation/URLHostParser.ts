/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../InternalLog';
import { SdkVerbosity } from '../../../../SdkVerbosity';
import type { Hostname } from '../domain/firstPartyHosts';

// matches what is between the first "://" and the next "/", ":" or whitespace
const hostRegex = '^.+://([^:/\\s]+)';

/**
 * Returns the host from an URL.
 * @returns the host (without the port) or null if could not cast the URL as host
 */
export const URLHostParser = (url: string): Hostname | null => {
    try {
        const matchedHost = url.match(hostRegex);
        if (matchedHost === null) {
            return null;
        }
        // [0] is the input, [1] is the captured group
        return matchedHost[1] as Hostname;
    } catch (e) {
        InternalLog.log(`Impossible to cast ${url} as URL`, SdkVerbosity.WARN);
        return null;
    }
};
