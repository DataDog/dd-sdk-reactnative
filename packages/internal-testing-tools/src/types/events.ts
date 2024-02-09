/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    RumActionEvent,
    RumViewEvent,
    RumErrorEvent,
    RumLongTaskEvent,
    RumResourceEvent,
    MobileSegment
} from 'rum-events-format';

export type Feature = 'rum' | 'tracing' | 'logging' | 'session-replay';

/**
 * Partial type of log event
 */
export type LogEvent = {
    message: string;
    status: string;
    ddtags: string;
    session_id: string;
};

/**
 * Partial type of trace event
 */
export type TraceEvent = {
    spans: Span[];
    env: string;
};

/**
 * Some fields are wrong, for instance view.id is viewID and has_full_snapshot is hasFullSnapshot
 */
export type SessionReplayEvent = MobileSegment & {
    viewID: string;
};

export type Span = {
    name: string;
    duration: number;
    service: string;
    type: string;
    trace_id: string;
    span_id: string;
    parent_id: string;
};

export type RumEvent =
    | RumActionEvent
    | RumViewEvent
    | RumErrorEvent
    | RumLongTaskEvent
    | RumResourceEvent;

export type DDEvent = LogEvent | TraceEvent | RumEvent | SessionReplayEvent;

export type eventTypeByFeature = {
    rum: RumEvent;
    tracing: TraceEvent;
    logging: LogEvent;
    'session-replay': SessionReplayEvent;
};
