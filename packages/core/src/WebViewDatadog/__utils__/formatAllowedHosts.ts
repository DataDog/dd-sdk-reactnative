/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { getErrorMessage, getErrorStackTrace } from '../../errorUtils';
import { DdSdk } from '../../foundation';

export function formatAllowedHosts(allowedHosts?: string[]): string {
    try {
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e: any) {
        DdSdk.telemetryError(
            getErrorMessage(e),
            getErrorStackTrace(e),
            'AllowedHostsError'
        );
        return "'[]'";
    }
}
