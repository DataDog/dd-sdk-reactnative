/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const DdAttributes = {
    /**
     * Custom "source type" of the error. Used in RUM errors. It names the
     * language or platform of the RUM error stack trace, so the SCI backend
     * knows how to symbolize it. Expects {@link String} value.
     */
    errorSourceType: '_dd.error.source_type',

    /**
     * Custom fingerprint to an error.
     * Expects {@link String} value.
     */
    errorFingerprint: '_dd.error.fingerprint'
};
