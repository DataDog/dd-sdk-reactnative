export abstract class DatadogBuffer {
    abstract addCallback: (callback: () => Promise<void>) => void;
    abstract addCallbackReturningId: (
        callback: () => Promise<string>
    ) => string;
    abstract addCallbackWithId: (
        callback: (id: string) => Promise<void>,
        id: string
    ) => void;
    abstract drain: () => void;
}
