/* eslint-disable @typescript-eslint/ban-ts-comment */
import { applyLogEventMapper, formatLogEvent } from '../eventMapper';
import type { LogEventMapper } from '../types';

describe('formatLogEvent', () => {
    it('formats a raw log without context to a LogEvent', () => {
        expect(
            formatLogEvent({ message: 'original', context: {} }, 'info')
        ).toEqual({
            message: 'original',
            context: {},
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

describe('applyLogEventMapper', () => {
    it('applies the log event mapper for the editable fields', () => {
        const logEventMapper: LogEventMapper = log => {
            log.message = 'new message';
            log.context = { loggedIn: true };
            return log;
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info'
            })
        ).toEqual({
            message: 'new message',
            context: { loggedIn: true },
            status: 'info'
        });
    });
    it('applies the log event mapper and prevents non-editable fields to be edited', () => {
        const logEventMapper: LogEventMapper = log => {
            // @ts-ignore
            log.status = 'fake status';
            return log;
        };

        expect(
            applyLogEventMapper(logEventMapper, {
                message: 'original',
                context: {},
                status: 'info'
            })
        ).toEqual({
            message: 'original',
            context: {},
            status: 'info'
        });
    });
});
