/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdRumResourceGraphqlError } from '../requestProxy/interfaces/RumResource';

/**
 * Extracts and filters GraphQL errors from an errors array.
 * Only extracts: message, code, locations, path
 */
export function extractGraphQLErrors(
    errors: any[]
): DdRumResourceGraphqlError[] {
    return errors
        .filter((error: any) => error && error.message) // Skip errors without message
        .map((error: any) => {
            const filtered: any = {
                message: String(error.message) // Ensure it's a string
            };

            // Extract code from extensions.code (preferred) or legacy top-level code
            const code = error.extensions?.code ?? error.code;
            if (code) {
                filtered.code = String(code);
            }

            // Extract locations array if present
            if (error.locations && Array.isArray(error.locations)) {
                const validLocations = error.locations
                    .filter(
                        (loc: any) =>
                            loc &&
                            typeof loc.line === 'number' &&
                            typeof loc.column === 'number'
                    )
                    .map((loc: any) => ({
                        line: loc.line,
                        column: loc.column
                    }));
                if (validLocations.length > 0) {
                    filtered.locations = validLocations;
                }
            }

            // Extract path array if present (can contain strings or numbers per GraphQL spec)
            if (error.path && Array.isArray(error.path)) {
                const validPath = error.path.filter(
                    (segment: any) =>
                        typeof segment === 'string' ||
                        typeof segment === 'number'
                );
                if (validPath.length > 0) {
                    filtered.path = validPath;
                }
            }

            return filtered;
        });
}
