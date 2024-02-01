import { buildTraceAssertions } from '../trace';

const generateTraceAssertions = (length: number) => {
    return buildTraceAssertions(
        Array(length)
            .fill(0)
            .map((_, index) => ({
                spans: [{}]
            }))
    );
};

describe('trace assertions', () => {
    describe('toHaveLength', () => {
        it('does not throw if the events have the correct length', () => {
            const trace = generateTraceAssertions(3);
            expect(() => trace.toHaveLength(3)).not.toThrow();
        });
        it('throws a meaningful error if the events do not have the correct length', () => {
            const trace = generateTraceAssertions(3);
            expect(() => trace.toHaveLength(2)).toThrow(
                'Trace events length did not match.'
            );
        });
    });
});
