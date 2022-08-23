import { BoundedBuffer } from '../BoundedBuffer';

describe('BoundedBuffer', () => {
    describe('void callbacks', () => {
        it('adds void callbacks then drains them', async () => {
            const buffer = new BoundedBuffer();
            const fakeCallback = jest.fn();
            buffer.addCallback(fakeCallback);
            await buffer.drain();

            expect(fakeCallback).toHaveBeenCalledTimes(1);

            await buffer.drain();
            expect(fakeCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe('callbacks with ids', () => {
        it('links the callbacks to pass the returned id from first callback', async () => {
            const buffer = new BoundedBuffer();

            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId');
            const callbackWithId = jest.fn();

            const bufferId = await buffer.addCallbackReturningId(
                callbackReturningId
            );
            buffer.addCallbackWithId(callbackWithId, bufferId);

            await buffer.drain();
            expect(callbackReturningId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledWith('callbackId');
        });

        it('links the correct the returned id when multiple callbacks are registered', async () => {
            const buffer = new BoundedBuffer();

            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId1')
                .mockReturnValueOnce('callbackId2');
            const callbackWithId = jest.fn();

            const bufferId1 = await buffer.addCallbackReturningId(
                callbackReturningId
            );
            const bufferId2 = await buffer.addCallbackReturningId(
                callbackReturningId
            );
            buffer.addCallbackWithId(callbackWithId, bufferId1);
            buffer.addCallbackWithId(callbackWithId, bufferId2);

            await buffer.drain();
            expect(callbackWithId).toHaveBeenCalledTimes(2);
            expect(callbackWithId).toHaveBeenNthCalledWith(1, 'callbackId1');
            expect(callbackWithId).toHaveBeenNthCalledWith(2, 'callbackId2');
        });
    });

    describe('buffer size', () => {
        it('does not add any new void callback when the limit size is reached', async () => {
            const buffer = new BoundedBuffer(3);
            const fakeCallback = jest.fn();

            buffer.addCallback(fakeCallback);
            buffer.addCallback(fakeCallback);
            buffer.addCallback(fakeCallback);
            buffer.addCallback(fakeCallback);

            await buffer.drain();
            expect(fakeCallback).toHaveBeenCalledTimes(3);
        });

        it('does not add any new callback with id when the limit size is reached', async () => {
            const buffer = new BoundedBuffer(1);
            const fakeCallback = jest.fn();
            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId');
            const callbackWithId = jest.fn();

            buffer.addCallback(fakeCallback);
            const bufferId = await buffer.addCallbackReturningId(
                callbackReturningId
            );
            buffer.addCallbackWithId(callbackWithId, bufferId);

            await buffer.drain();
            expect(fakeCallback).toHaveBeenCalledTimes(1);
            expect(callbackReturningId).not.toHaveBeenCalled();
            expect(callbackWithId).not.toHaveBeenCalled();
        });

        it('adds corresponding callback with id even if the limit size is reached when corresponding callback exists', async () => {
            const buffer = new BoundedBuffer(2);
            const fakeCallback = jest.fn();
            const callbackReturningId = jest
                .fn()
                .mockReturnValueOnce('callbackId');
            const callbackWithId = jest.fn();

            buffer.addCallback(fakeCallback);
            const bufferId = await buffer.addCallbackReturningId(
                callbackReturningId
            );
            buffer.addCallbackWithId(callbackWithId, bufferId);

            await buffer.drain();
            expect(fakeCallback).toHaveBeenCalledTimes(1);
            expect(callbackReturningId).toHaveBeenCalledTimes(1);
            expect(callbackWithId).toHaveBeenCalledTimes(1);
        });
    });
});
