export abstract class DatadogBuffer {
    abstract addCallback: (callback: () => Promise<void>) => Promise<void>;
    abstract addCallbackReturningId: (
        callback: () => Promise<string>
    ) => Promise<string>;
    abstract addCallbackWithId: (
        callback: (id: string) => Promise<void>,
        id: string
    ) => Promise<void>;
    abstract drain: () => void;
}
