import { BufferSingleton } from '../BufferSingleton';

const flushPromises = () => new Promise<void>(setImmediate);

describe('BufferSingleton', () => {
    afterEach(() => {
        BufferSingleton.reset();
    });
    describe('addCallback', () => {
        it('drains callbacks and replaces the buffer by a pass through on initialization', async () => {
            const fakeCallback = jest.fn();
            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId');
            const callbackWithId = jest.fn();

            // registering callbacks
            BufferSingleton.addCallback(fakeCallback);
            const bufferId = BufferSingleton.addCallbackReturningId(
                callbackReturningId
            );
            BufferSingleton.addCallbackWithId(callbackWithId, bufferId);

            // initialization
            BufferSingleton.onInitialization();

            // registering a new callback
            BufferSingleton.addCallback(fakeCallback);

            await flushPromises();
            expect(fakeCallback).toHaveBeenCalledTimes(2);
            expect(callbackReturningId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledWith('callbackId');
        });
    });
});
