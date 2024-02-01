import type { RumResourceEvent } from 'rum-events-format';

export const mockRumResource = ({
    method,
    url
}: {
    method?: RumResourceEvent['resource']['method'];
    url?: string;
}): RumResourceEvent => {
    return {
        type: 'resource',
        resource: {
            method: method || 'GET',
            url: url || 'https://datadoghq.com'
        }
    } as RumResourceEvent;
};
