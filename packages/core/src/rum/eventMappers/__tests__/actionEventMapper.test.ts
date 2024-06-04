import { RumActionType } from '../../types';
import { generateActionEventMapper } from '../actionEventMapper';

describe('actionEventMapper', () => {
    it('modifies the action name', () => {
        const actionEventMapper = generateActionEventMapper(event => {
            return {
                ...event,
                name: '[REDACTED]'
            };
        });

        const mappedEvent = actionEventMapper.applyEventMapper({
            type: RumActionType.CUSTOM,
            name: 'John Doe',
            context: {},
            timestampMs: Date.now()
        });

        expect(mappedEvent?.name).toBe('[REDACTED]');
    });
});
