import { InternalLog } from '../../InternalLog';
import { SdkVerbosity } from '../../SdkVerbosity';
import { validateContext } from '../argsUtils';

jest.mock('../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        },
        DATADOG_MESSAGE_PREFIX: 'DATADOG:'
    };
});

describe('argsUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateContext', () => {
        it('returns empty object if context is null', () => {
            expect(validateContext(null)).toEqual({});
            expect(validateContext(undefined)).toEqual({});
        });

        it('returns empty object with error if context is raw type', () => {
            expect(validateContext('raw-type')).toEqual({});
            expect(InternalLog.log).toHaveBeenNthCalledWith(
                1,
                expect.anything(),
                SdkVerbosity.ERROR
            );
        });

        it('nests array inside of new object if context is an array', () => {
            const context = [{ a: 1, b: 2 }, 1, true];
            const validatedContext = validateContext(context);

            expect(InternalLog.log).toHaveBeenNthCalledWith(
                1,
                expect.anything(),
                SdkVerbosity.WARN
            );

            expect(validatedContext).toEqual({
                context
            });
        });

        it('returns unmodified context if it is a valid object', () => {
            const context = {
                testA: 1,
                testB: {}
            };
            const validatedContext = validateContext(context);

            expect(validatedContext).toEqual(context);
        });
    });
});
