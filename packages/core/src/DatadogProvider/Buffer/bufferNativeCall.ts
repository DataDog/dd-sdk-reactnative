import { BufferSingleton } from './BufferSingleton';

export const bufferVoidNativeCall = (callback: () => Promise<void>) => {
    return BufferSingleton.addCallback(callback);
};

export const bufferNativeCallReturningId = (
    callback: () => Promise<string>
) => {
    return BufferSingleton.addCallbackReturningId(callback);
};

export const bufferNativeCallWithId = (
    callback: (id: string) => Promise<void>,
    id: string
) => {
    return BufferSingleton.addCallbackWithId(callback, id);
};
