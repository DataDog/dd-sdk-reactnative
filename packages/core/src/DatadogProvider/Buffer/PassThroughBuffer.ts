import { DatadogBuffer } from './DatadogBuffer';

export class PassThroughBuffer extends DatadogBuffer {
    addCallback = (callback: () => any) => callback();
    addCallbackReturningId = (callback: () => any) => callback();
    addCallbackWithId = (callback: (id: string) => any, id: string) =>
        callback(id);

    drain = () => undefined;
}
