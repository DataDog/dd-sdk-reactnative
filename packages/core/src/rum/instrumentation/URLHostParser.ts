/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// matches what is between the first "://" and the next "/", ":" or whitespace
const hostRegex = '^.+://([^:/\\s]+)';

/**
 * Returns the host from an URL.
 * @returns the host (without the port)
 * @throws if URL is not well formatted
 */
export const URLHostParser = (url: string): string => {
    const matchedHost = url.match(hostRegex);
    if (matchedHost === null) {
        throw new Error(`${url} is not a correctly formatted URL`);
    }

    // [0] is the input, [1] is the captured group
    return matchedHost[1];
};
