/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    acknowledgesExperimentationOptOut,
    parsePrecomputedConfigurationResponse,
    SUPPORTED_FLAGS_CAPABILITIES,
    timeStampNow
} from '@datadog/flagging-core';
import type { FlagSelection, FlagsConfiguration } from '@datadog/flagging-core';
import {
    GeneralError,
    InvalidContextError,
    ParseError
} from '@openfeature/web-sdk';
import type { EvaluationContext } from '@openfeature/web-sdk';

import {
    buildConfigurationUrl,
    defaultLogger,
    getErrorMessage,
    reportIgnoredSelection
} from './configurationFetchUtils';
import { readFlagSelection, reportSelectionError } from './flagSelection';
import { version } from './version';

const capabilities = [...SUPPORTED_FLAGS_CAPABILITIES].sort().join(',');
const assignmentAuthorizationFailed = 'ASSIGNMENT_AUTHORIZATION_FAILED';

export interface PrecomputedConfigurationFetchOptions {
    clientToken: string;
    env: string;
    /** The subject and attributes to precompute. JSON values are captured before the request. */
    context: EvaluationContext;
    applicationId?: string;
    /** Datadog site domain, such as 'datadoghq.eu'. Defaults to 'datadoghq.com'. */
    site?: string;
    /** Request matching tags or key patterns. Invalid or over-limit selections are not sent. */
    flagSelection?: FlagSelection;
    /** Reports selection and assignment-token diagnostics. Defaults to a prefixed console warning. */
    logger?: { error(message: string): void };
    fetch?: typeof globalThis.fetch;
    signal?: AbortSignal;
}

/** Fetches a context-bound snapshot once, without native initialization or tracking. */
export async function fetchPrecomputedConfiguration(
    options: PrecomputedConfigurationFetchOptions
): Promise<FlagsConfiguration> {
    const url = buildConfigurationUrl(options.site, options.env, 'precomputed');
    const logger = options.logger ?? defaultLogger;
    const { context, attributes, assignmentToken: rawToken } = captureContext(
        options.context
    );
    const assignmentToken = normalizeAssignmentToken(rawToken, logger);
    const selection = readFlagSelection(options.flagSelection, logger);
    const body = JSON.stringify({
        data: {
            type: 'precompute-assignments-request',
            attributes: {
                env: { dd_env: options.env },
                source: { sdk_name: 'react-native', sdk_version: version },
                subject: {
                    targeting_key: context.targetingKey ?? '',
                    targeting_attributes: attributes
                },
                ...(selection && {
                    flag_selection: {
                        tags: selection.tags,
                        key_patterns: selection.keyPatterns
                    }
                })
            }
        }
    });
    const fetchedAt = timeStampNow();
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    let response: Response;
    let authorizationRejected: boolean;
    try {
        response = await fetchImplementation(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/vnd.api+json',
                'dd-client-token': options.clientToken,
                'X-DD-FEATURE-FLAGS-CAPABILITIES': capabilities,
                ...(options.applicationId && {
                    'dd-application-id': options.applicationId
                }),
                ...(assignmentToken && {
                    'DD-Assignment-Token': assignmentToken
                })
            },
            body,
            signal: options.signal
        });
        authorizationRejected = await isAssignmentAuthorizationRejection(
            response
        );
    } catch (error) {
        if (!assignmentToken) {
            throw error;
        }
        throw redactCredentialError(
            error,
            new Error('Failed to fetch flag configuration: transport error')
        );
    }
    if (authorizationRejected) {
        throw new GeneralError(assignmentAuthorizationFailed);
    }
    if (!response.ok) {
        const message = assignmentToken
            ? `HTTP ${response.status}`
            : await getErrorMessage(response);
        throw new Error(`Failed to fetch flag configuration: ${message}`);
    }
    let parsed: ReturnType<typeof parsePrecomputedConfigurationResponse>;
    try {
        parsed = parsePrecomputedConfigurationResponse(await response.json());
    } catch (error) {
        if (!assignmentToken) {
            throw error;
        }
        throw redactCredentialError(
            error,
            new ParseError('Assignment response is not valid JSON')
        );
    }
    if ('error' in parsed) {
        return { precomputedError: parsed.error };
    }
    // Like the current RN evaluator, this helper uses the default disabled experimentation policy.
    if (!acknowledgesExperimentationOptOut({ precomputed: parsed }, false)) {
        throw new ParseError(
            'The assignment response used a different experimentation opt-out policy'
        );
    }
    const configuration: FlagsConfiguration = {
        precomputed: { ...parsed, context, fetchedAt }
    };
    if (selection) {
        reportIgnoredSelection(response, logger);
    }
    return configuration;
}

function captureContext(input: EvaluationContext) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error();
        }
        const assignmentToken = input.dd_assignment_token;
        const entries: Array<[string, unknown]> = [];
        const attributes: Array<[string, string]> = [];
        for (const key of Object.keys(input)) {
            if (key === 'dd_assignment_token') {
                continue;
            }
            const value = input[key];
            if (
                key === 'targetingKey' &&
                value !== undefined &&
                typeof value !== 'string'
            ) {
                throw new Error();
            }
            const serialized =
                typeof value === 'string' ? value : JSON.stringify(value);
            if (serialized !== undefined) {
                attributes.push([key, serialized]);
                entries.push([
                    key,
                    typeof value === 'string' ? value : JSON.parse(serialized)
                ]);
            }
        }
        return {
            context: Object.fromEntries(entries) as EvaluationContext,
            attributes: Object.fromEntries(attributes),
            assignmentToken
        };
    } catch {
        throw new InvalidContextError(
            'Precomputed context must be a JSON-serializable object with an optional string targetingKey'
        );
    }
}

function normalizeAssignmentToken(
    value: unknown,
    logger: { error(message: string): void }
): string | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value === 'string' && /^[\x21-\x7e]+$/.test(value)) {
        return value;
    }
    reportSelectionError(
        logger,
        'Assignment token omitted: expected printable ASCII without whitespace. Continuing without an assignment token.'
    );
    return undefined;
}

function redactCredentialError(error: unknown, fallback: Error): Error {
    try {
        const name = (error as Error)?.name;
        if (name === 'AbortError' || name === 'TimeoutError') {
            const sanitized = new Error(
                name === 'AbortError'
                    ? 'Assignment download aborted'
                    : 'Assignment download timed out'
            );
            sanitized.name = name;
            return sanitized;
        }
    } catch {
        // Custom transports can expose credentials through error accessors too.
    }
    return fallback;
}

async function isAssignmentAuthorizationRejection(
    response: Response
): Promise<boolean> {
    if (response.status !== 401) {
        return false;
    }
    try {
        const body = await response.clone().json();
        return (
            Array.isArray(body?.errors) &&
            body.errors.some(
                (error: { code?: unknown } | null) =>
                    error?.code === assignmentAuthorizationFailed
            )
        );
    } catch (error) {
        const name = (error as Error)?.name;
        if (name === 'AbortError' || name === 'TimeoutError') {
            throw error;
        }
        return false;
    }
}
