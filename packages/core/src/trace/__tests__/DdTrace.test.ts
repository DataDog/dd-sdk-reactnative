import { NativeModules } from 'react-native';

import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import { BufferSingleton } from '../../sdk/DatadogProvider/Buffer/BufferSingleton';
import { DdTrace } from '../DdTrace';

jest.mock('../../utils/time-provider/DefaultTimeProvider', () => {
    return {
        DefaultTimeProvider: jest.fn().mockImplementation(() => {
            return { now: jest.fn().mockReturnValue(456) };
        })
    };
});

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('DdTrace', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        BufferSingleton.onInitialization();
    });

    describe('Context validation', () => {
        describe('DdTrace.startSpan', () => {
            test('uses given context when context is valid', async () => {
                const context = {
                    testA: 123,
                    testB: 'ok'
                };
                await DdTrace.startSpan('operation', context);

                expect(NativeModules.DdTrace.startSpan).toHaveBeenCalledWith(
                    'operation',
                    context,
                    expect.anything()
                );
            });

            test('uses empty context with error when context is invalid or null', async () => {
                const context: any = 123;
                await DdTrace.startSpan('operation', context);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(NativeModules.DdTrace.startSpan).toHaveBeenCalledWith(
                    'operation',
                    {},
                    expect.anything()
                );
            });

            test('nests given context in new object when context is array', async () => {
                const context: any = [123, '456'];
                await DdTrace.startSpan('operation', context);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(NativeModules.DdTrace.startSpan).toHaveBeenCalledWith(
                    'operation',
                    { context },
                    expect.anything()
                );
            });
        });

        describe('DdTrace.finishSpan', () => {
            test('uses given context when context is valid', async () => {
                const context = {
                    testA: 123,
                    testB: 'ok'
                };

                const spanId = await DdTrace.startSpan('operation', {});
                await DdTrace.finishSpan(spanId, context);

                expect(NativeModules.DdTrace.finishSpan).toHaveBeenCalledWith(
                    spanId,
                    context,
                    expect.anything()
                );
            });

            test('uses empty context with error when context is invalid or null', async () => {
                const context: any = 123;
                await DdTrace.startSpan('operation', context);

                const spanId = await DdTrace.startSpan('operation', {});
                await DdTrace.finishSpan(spanId, context);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    1,
                    expect.anything(),
                    SdkVerbosity.ERROR
                );

                expect(NativeModules.DdTrace.finishSpan).toHaveBeenCalledWith(
                    spanId,
                    {},
                    expect.anything()
                );
            });

            test('nests given context in new object when context is array', async () => {
                const context: any = [123, '456'];

                const spanId = await DdTrace.startSpan('operation', {});
                await DdTrace.finishSpan(spanId, context);

                expect(InternalLog.log).toHaveBeenNthCalledWith(
                    3,
                    expect.anything(),
                    SdkVerbosity.WARN
                );

                expect(NativeModules.DdTrace.finishSpan).toHaveBeenCalledWith(
                    spanId,
                    { context },
                    expect.anything()
                );
            });
        });
    });
});
