import { buildLogsAssertions } from '../logs';

const generateLogsAssertions = (length: number) => {
    return buildLogsAssertions(
        Array(length)
            .fill(0)
            .map((_, index) => ({
                message: `fake log message number ${index}`,
                status: 'debug',
                ddtags: '',
                session_id: ''
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

    describe('toHaveLogWith', () => {
        it('does not throw if it contains a log with correct status and message', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    status: 'debug',
                    message: 'fake log message number 1'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a log with correct status when no message is specified', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    status: 'debug'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a log with correct message when no status is specified', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    message: 'fake log message number 1'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain a log with correct message and status', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    status: 'info',
                    message: 'fake log message number 1'
                })
            ).toThrow();
            expect(() =>
                logs.toHaveLogWith({
                    status: 'debug',
                    message: 'fake log message number 5'
                })
            ).toThrow();
        });
        it('throws if it does not contain a log with correct status when no message is specified', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    status: 'info'
                })
            ).toThrow();
        });
        it('throws if it does not contain a log with correct message when no status is specified', () => {
            const logs = generateLogsAssertions(3);
            expect(() =>
                logs.toHaveLogWith({
                    message: 'fake log message number 5'
                })
            ).toThrow();
        });

        it('throws if no status and no message were provided', () => {
            const logs = generateLogsAssertions(3);
            expect(() => logs.toHaveLogWith({})).toThrow();
        });
    });
});
