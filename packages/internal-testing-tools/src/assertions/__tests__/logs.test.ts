import { buildLogsAssertions } from '../logs';

const generateLogsAssertions = (length: number) => {
    return buildLogsAssertions(
        Array(length)
            .fill(0)
            .map((_, index) => ({
                message: `fake log message number ${index}`,
                status: 'debug'
            }))
    );
};

describe('logs assertions', () => {
    describe('toHaveLength', () => {
        it('does not throw if the events have the correct length', () => {
            const logs = generateLogsAssertions(3);
            expect(() => logs.toHaveLength(3)).not.toThrow();
        });
        it('throws a meaningful error if the events do not have the correct length', () => {
            const logs = generateLogsAssertions(3);
            expect(() => logs.toHaveLength(2)).toThrow(
                'Logs events length did not match.'
            );
        });
    });
});
