import type {
    RumActionEvent,
    RumErrorEvent,
    RumEvent,
    RumLongTaskEvent,
    RumResourceEvent,
    RumViewEvent
} from 'rum-events-format';

import { buildRumActionAssertions } from './actions';
import { buildRumErrorAssertions } from './errors';
import { buildRumLongTaskAssertions } from './longTasks';
import { buildRumResourceAssertions } from './resource';
import { buildRumViewAssertions } from './view';

type RumEventsByType = {
    actions: RumActionEvent[];
    errors: RumErrorEvent[];
    longTasks: RumLongTaskEvent[];
    resources: RumResourceEvent[];
    views: RumViewEvent[];
};

export const buildRumAssertions = (events: RumEvent[]) => {
    const {
        actions,
        errors,
        longTasks,
        resources,
        views
    } = events.reduce<RumEventsByType>(
        (sortedEvents, event) => {
            switch (event.type) {
                case 'action':
                    sortedEvents.actions.push(event);
                    break;
                case 'error':
                    sortedEvents.errors.push(event);
                    break;
                case 'long_task':
                    sortedEvents.longTasks.push(event);
                    break;
                case 'resource':
                    sortedEvents.resources.push(event);
                    break;
                case 'view':
                    sortedEvents.views.push(event);
                    break;
            }
            return sortedEvents;
        },
        { actions: [], errors: [], longTasks: [], resources: [], views: [] }
    );

    return {
        actions: buildRumActionAssertions(actions),
        errors: buildRumErrorAssertions(errors),
        longTasks: buildRumLongTaskAssertions(longTasks),
        resources: buildRumResourceAssertions(resources),
        views: buildRumViewAssertions(views)
    };
};
