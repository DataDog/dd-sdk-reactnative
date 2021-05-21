/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type EventsInterceptor from './EventsInterceptor'

export default class NoOpEventsInterceptor implements EventsInterceptor {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interceptOnPress(..._args: any[]): void {
        // NoOp
    }
}