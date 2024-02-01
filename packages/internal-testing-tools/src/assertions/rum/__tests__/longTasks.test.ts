import { buildRumLongTaskAssertions } from '../longTasks';

import { mockRumLongTask } from './__utils__/longTasks.mock';

describe('longTasks assertions', () => {
    describe('toHaveLongTaskWith', () => {
        it('does not throw if it contains a long task with correct thread and duration', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 200_000_000,
                    thread: 'javascript'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    duration: {
                        minMs: 100,
                        maxMs: 300
                    },
                    thread: 'js'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a long task with correct duration', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 500_000_000
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    duration: {
                        minMs: 450,
                        maxMs: 550
                    }
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a long task with main thread', () => {
            const longTasks = [
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'Main thread crashing'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    thread: 'main'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a long task with no thread and looking for main thread', () => {
            const longTasks = [
                mockRumLongTask({
                    duration: 500_000_000
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    thread: 'main'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains a long task with js thread', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'javascript'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    thread: 'js'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain a long task with correct thread and duration', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'javascript'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    duration: {
                        minMs: 450,
                        maxMs: 550
                    },
                    thread: 'main'
                })
            ).toThrow();
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    duration: {
                        minMs: 530,
                        maxMs: 550
                    },
                    thread: 'js'
                })
            ).toThrow();
        });
        it('throws if it does not contain a long task with correct duration', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'javascript'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    duration: {
                        minMs: 530,
                        maxMs: 550
                    }
                })
            ).toThrow();
        });
        it('throws if it does not contain a long task with javascript thread', () => {
            const longTasks = [
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'main thread'
                }),
                mockRumLongTask({
                    duration: 500_000_000
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() =>
                longTaskAssertions.toHaveLongTaskWith({
                    thread: 'js'
                })
            ).toThrow();
        });
        it('throws if no thread or duration were provided ', () => {
            const longTasks = [
                mockRumLongTask({}),
                mockRumLongTask({
                    duration: 500_000_000,
                    thread: 'logger'
                })
            ];
            const longTaskAssertions = buildRumLongTaskAssertions(longTasks);
            expect(() => longTaskAssertions.toHaveLongTaskWith({})).toThrow();
        });
    });
});
