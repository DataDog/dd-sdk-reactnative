import { buildRumErrorAssertions } from '../errors';

import { mockRumError } from './__utils__/errors.mock';

describe('errors assertions', () => {
    describe('toHaveErrorWith', () => {
        it('does not throw if it contains an error with correct source and message', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'JS thread crash',
                    source: 'source'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    message: 'JS thread crash',
                    source: 'source'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an error with correct message', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    message: 'Logger error'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an error with correct source', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    source: 'logger'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain an error with correct source and message', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    message: 'Logger error',
                    source: 'custom'
                })
            ).toThrow();
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    message: 'Crash',
                    source: 'logger'
                })
            ).toThrow();
        });
        it('throws if it does not contain an error with correct message', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    message: 'crash'
                })
            ).toThrow();
        });
        it('throws if it does not contain an error with correct source', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() =>
                errorAssertions.toHaveErrorWith({
                    source: 'custom'
                })
            ).toThrow();
        });
        it('throws if no source or message were provided ', () => {
            const errors = [
                mockRumError({}),
                mockRumError({
                    message: 'Logger error',
                    source: 'logger'
                })
            ];
            const errorAssertions = buildRumErrorAssertions(errors);
            expect(() => errorAssertions.toHaveErrorWith({})).toThrow();
        });
    });
});
