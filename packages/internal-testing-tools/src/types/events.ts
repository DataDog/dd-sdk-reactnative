export type LogEvent = {
    message: string;
    status: string;
};

export type TraceEvent = {
    spans: Span[];
};

export type Span = Record<string, any>;

export type Event = LogEvent | TraceEvent;
