/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
export default interface EventsInterceptor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interceptOnPress(...args: any[]): void
}