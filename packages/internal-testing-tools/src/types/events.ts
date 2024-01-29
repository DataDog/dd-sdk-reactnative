export type Feature = 'rum' | 'tracing' | 'logging' | 'session-replay';

export type LogEvent = {
    message: string;
    status: string;
};

export type TraceEvent = {
    spans: Span[];
};

export type RumEvent = unknown;

export type SessionReplayEvent = unknown;

export type Span = Record<string, any>;

export type Event = LogEvent | TraceEvent;

export type eventTypeByFeature = {
    rum: RumEvent;
    tracing: TraceEvent;
    logging: LogEvent;
    'session-replay': SessionReplayEvent;
};
