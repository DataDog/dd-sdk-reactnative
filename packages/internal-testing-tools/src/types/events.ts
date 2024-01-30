import type {
    RumActionEvent,
    RumViewEvent,
    RumErrorEvent,
    RumLongTaskEvent,
    RumResourceEvent
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

export type SessionReplayEvent = unknown;

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
