import type { RumLongTaskEvent } from 'rum-events-format';

export const mockRumLongTask = ({
    duration,
    thread
}: {
    duration?: number;
    thread?: string;
}): RumLongTaskEvent => {
    return {
        type: 'long_task',
        long_task: {
            duration: duration || 0
        },
        context: {
            'long_task.target': thread
        },
        date: 0,
        application: {
            id: ''
        },
        session: {
            id: '',
            type: 'user'
        },
        view: {
            id: '',
            url: ''
        },
        _dd: {
            format_version: 2
        }
    } as RumLongTaskEvent;
};
