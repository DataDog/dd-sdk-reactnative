import { formatLogEvent } from '../eventMapper';

describe('formatLogEvent', () => {
    it('formats a raw log without context to a LogEvent', () => {
        expect(formatLogEvent({ message: 'original' }, 'info')).toEqual({
            message: 'original',
            status: 'info'
        });
    });

    it('formats a raw log with context to a LogEvent', () => {
        expect(
            formatLogEvent(
                { message: 'original', context: { loggedIn: true } },
                'info'
            )
        ).toEqual({
            message: 'original',
            context: { loggedIn: true },
            status: 'info'
        });
    });
});
