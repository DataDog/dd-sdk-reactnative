import { BoundedBuffer } from './BoundedBuffer';
import type { DatadogBuffer } from './DatadogBuffer';
import { PassThroughBuffer } from './PassThroughBuffer';

export class BufferSingleton {
    static bufferInstance: DatadogBuffer = new BoundedBuffer();

    static addCallback = (callback: () => Promise<void>): Promise<void> => {
        return BufferSingleton.bufferInstance.addCallback(callback);
    };

    static addCallbackReturningId = (
        callback: () => Promise<string>
    ): Promise<string> => {
        return BufferSingleton.bufferInstance.addCallbackReturningId(callback);
    };

    static addCallbackWithId = (
        callback: (id: string) => Promise<void>,
        id: string
    ): Promise<void> => {
        return BufferSingleton.bufferInstance.addCallbackWithId(callback, id);
    };

    static onInitialization = () => {
        BufferSingleton.bufferInstance.drain();
        BufferSingleton.bufferInstance = new PassThroughBuffer();
    };

    static reset = () => {
        BufferSingleton.bufferInstance = new BoundedBuffer();
    };
}
