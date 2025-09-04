/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
export type NavigationState = {
    activeView: string | undefined;
    trackingState: 'TRACKING' | 'NOT_TRACKING';
};

export type NavigationStateEventType = 'START_VIEW' | 'STOP_VIEW' | 'DISCARDED';

export class StateEvent {
    name: string;
    shortTimestamp: string = '';
    fullTimestamp: string = '';
    constructor(name: string, timestamp: number) {
        this.name = name;
        const date = new Date(timestamp);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();

        this.shortTimestamp = `${hours}:${minutes}:${seconds}:${milliseconds}`;
        this.fullTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}:${milliseconds}`;
    }
}

class StartTrackingStateEvent extends StateEvent {
    constructor() {
        super('INITIALIZE', Date.now());
    }
}

class StopTrackingStateEvent extends StateEvent {
    constructor() {
        super('STOP_TRACKING', Date.now());
    }
}

class NewRouteStateEvent extends StateEvent {
    previousRoute: string;
    newRoute: string;

    constructor(previousRoute: string, newRoute: string) {
        super('NEW_ROUTE', Date.now());
        this.previousRoute = previousRoute;
        this.newRoute = newRoute;
    }
}

class AppStateChangeEvent extends StateEvent {
    previousState: string;
    newState: string;

    constructor(previousState: string, newState: string) {
        super('APP_STATE_CHANGE', Date.now());
        this.previousState = previousState;
        this.newState = newState;
    }
}

class NavigationStateEvent extends StateEvent {
    eventType: 'START_VIEW' | 'STOP_VIEW' | 'DISCARDED';
    view: string;
    reason: StateEvent;
    state: NavigationState;

    constructor(
        eventType: 'START_VIEW' | 'STOP_VIEW' | 'DISCARDED',
        view: string,
        reason: StateEvent | undefined,
        state: NavigationState
    ) {
        super('NAVIGATION_STATE_EVENT', Date.now());
        this.view = view;
        this.eventType = eventType;
        this.reason = reason ?? new StateEvent('UNKNOWN_EVENT', Date.now());
        this.state = state;
    }
}

export class NavigationTimeline {
    readonly events: StateEvent[] = [];

    addStartTrackingEvent(): StartTrackingStateEvent {
        return this.addEvent(new StartTrackingStateEvent());
    }

    addStopTrackingEvent(): StopTrackingStateEvent {
        return this.addEvent(new StopTrackingStateEvent());
    }

    addNewRouteEvent(
        previousRoute: string | undefined,
        newRoute: string | undefined
    ): NewRouteStateEvent {
        return this.addEvent(
            new NewRouteStateEvent(
                previousRoute ?? 'undefined',
                newRoute ?? 'undefined'
            )
        );
    }

    addAppStateChangeEvent(
        previousState: string | undefined,
        newState: string
    ): AppStateChangeEvent {
        return this.addEvent(
            new AppStateChangeEvent(previousState || 'undefined', newState)
        );
    }

    addNavigationStateEvent(
        eventType: NavigationStateEventType,
        view: string,
        reason: StateEvent | undefined,
        state: NavigationState
    ): NavigationStateEvent {
        return this.addEvent(
            new NavigationStateEvent(eventType, view, reason, state)
        );
    }

    addEvent<T extends StateEvent>(stateEvent: T): T {
        this.events.push(stateEvent);
        return stateEvent;
    }
}
