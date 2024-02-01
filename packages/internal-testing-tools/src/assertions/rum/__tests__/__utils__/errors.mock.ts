import type { RumErrorEvent } from 'rum-events-format';

export const mockRumError = ({
    source,
    message
}: {
    source?: RumErrorEvent['error']['source'];
    message?: string;
}): RumErrorEvent => {
    return {
        type: 'error',
        error: {
            source: source || 'source',
            message: message || 'RUM Error'
        }
    } as RumErrorEvent;
};
