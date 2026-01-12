import { getGlobalInstance } from '../utils/singletonUtils';

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
const SESSION_INFO_MODULE = 'com.datadog.reactnative.sdk.session_info';

class _SessionInfo {
    sessionId: string | undefined = undefined;
    userId: string | undefined = undefined;
    accountId: string | undefined = undefined;

    _reset() {
        this.sessionId = undefined;
        this.userId = undefined;
        this.accountId = undefined;
    }
}

const SessionInfo = getGlobalInstance(
    SESSION_INFO_MODULE,
    () => new _SessionInfo()
);

// Helper functions to interact with the SessionInfo singleton
export const getCachedSessionId = () => {
    return SessionInfo.sessionId;
};

export const setCachedSessionId = (sessionId: string) => {
    SessionInfo.sessionId = sessionId;
};

export const clearCachedSessionId = () => {
    SessionInfo.sessionId = undefined;
};

export const getCachedUserId = () => {
    return SessionInfo.userId;
};

export const setCachedUserId = (userId: string) => {
    SessionInfo.userId = userId;
};

export const clearCachedUserId = () => {
    SessionInfo.userId = undefined;
};

export const getCachedAccountId = () => {
    return SessionInfo.accountId;
};

export const setCachedAccountId = (accountId: string) => {
    SessionInfo.accountId = accountId;
};

export const clearCachedAccountId = () => {
    SessionInfo.accountId = undefined;
};
