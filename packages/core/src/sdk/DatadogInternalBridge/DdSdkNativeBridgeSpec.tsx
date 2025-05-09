/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export interface DdSdkNativeBridgeSpec {
    /**
     * Internal event used to retrieve the RUM Session ID from 'RUMSessionStarted' native events.
     * @param sessionId The current RUM Session ID.
     */
    __datadogRumSessionStarted(sessionId: string): void;
}
