/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumResourceEvent } from 'rum-events-format';

import { AssertionError } from '../assertionError';

export const buildRumResourceAssertions = (events: RumResourceEvent[]) => {
    return {
        toHaveResourceWith: ({
            url,
            method
        }: {
            url?: string;
            method?: RumResourceEvent['resource']['method'];
        }) => {
            if (!url && !method) {
                throw new Error(
                    'toHaveResourceWith was called without a method or a url. Please specify at least one of them.'
                );
            }
            const resourceMatching = events.find(resource => {
                if (url && !resource.resource.url.match(url)) {
                    return false;
                }
                if (method && resource.resource.method !== method) {
                    return false;
                }
                return true;
            });
            if (!resourceMatching) {
                throw new AssertionError(
                    'Could not find resource matching method and url.',
                    `${method && `method: "${method}"`} ${
                        url && `url: "${url}"`
                    }`,
                    undefined,
                    events
                );
            }
        }
    };
};
