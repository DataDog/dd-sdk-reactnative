/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import { DdRum } from '../DdRum';

const SESSION_ID_POLL_INTERVAL = 500;
const SESSION_ID_POLL_MAX_ATTEMPTS = 10;
const SESSION_ID_VERIFY_DELAY = 1500;

let _cachedSessionId: string | undefined;
let _pollForSessionIdTimeout: NodeJS.Timeout | undefined;
let _verifySessionIdTimeout: NodeJS.Timeout | undefined;

export const pollForSessionId = (
    intervalMs = SESSION_ID_POLL_INTERVAL,
    maxAttempts = SESSION_ID_POLL_MAX_ATTEMPTS
): void => {
    let attempts = 0;

    const poll = async () => {
        if (_pollForSessionIdTimeout) {
            clearTimeout(_pollForSessionIdTimeout);
        }
        attempts++;
        try {
            const id = await DdRum.getCurrentSessionId();
            if (id) {
                _cachedSessionId = id;
                InternalLog.log(
                    `Retrieved RUM Session ID after ${attempts} attempts: ${id}`,
                    SdkVerbosity.DEBUG
                );
                return;
            }
        } catch (e) {
            /* empty */
        }

        if (attempts < maxAttempts) {
            _pollForSessionIdTimeout = setTimeout(poll, intervalMs);
        } else {
            InternalLog.log(
                `Cannot retrieve RUM Session ID after ${attempts} attempts.`,
                SdkVerbosity.DEBUG
            );
        }
    };

    poll();
};

export const verifySessionId = () => {
    if (_verifySessionIdTimeout) {
        clearTimeout(_verifySessionIdTimeout);
    }
    _verifySessionIdTimeout = setTimeout(() => {
        if (!_cachedSessionId) {
            pollForSessionId();
        }
    }, SESSION_ID_VERIFY_DELAY);
};

export const getCachedSessionId = () => {
    return _cachedSessionId;
};

export const setCachedSessionId = (sessionId: string) => {
    _cachedSessionId = sessionId;
};
