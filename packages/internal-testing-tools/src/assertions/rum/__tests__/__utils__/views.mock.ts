import type { RumViewEvent } from 'rum-events-format';

export const mockRumView = ({ name }: { name?: string }): RumViewEvent => {
    return {
        type: 'view',
        view: {
            name
        }
    } as RumViewEvent;
};
