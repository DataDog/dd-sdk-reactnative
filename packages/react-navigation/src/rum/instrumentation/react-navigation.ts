/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * This file contains copy/pastes from react-navigation types. The types have been simplified to be able to work with
 * both v5 and v6.
 * This is needed because NavigationContainerRef became NavigationContainerRef<T> in v6, and so we cannot keep compatibility
 * between the 2 types. Also this way we never import '@react-navigation/native-vX' in our code.
 */

/**
 * Route
 */

export declare type Route<
    RouteName extends string,
    Params extends object | undefined = object | undefined
> = Readonly<{
    /**
     * Unique key for the route.
     */
    key: string;
    /**
     * User-provided name for the route.
     */
    name: RouteName;
}> &
    (undefined extends Params
        ? Readonly<{
              /**
               * Params for this route
               */
              params?: Readonly<Params>;
          }>
        : Readonly<{
              /**
               * Params for this route
               */
              params: Readonly<Params>;
          }>);

/**
 * Navigation Container
 */

export declare type NavigationContainerRef = EventConsumer<NavigationContainerEventMap> & {
    canGoBack(): boolean;
    getCurrentRoute(): Route<string> | undefined;
};

export declare type NavigationContainerEventMap = {
    /**
     * Event which fires when the navigation state changes.
     */
    state: {
        data: {
            /**
             * The updated state object after the state change.
             */
            state: any;
        };
    };
    /**
     * Event which fires when current options changes.
     */
    options: {
        data: {
            options: object;
        };
    };
    /**
     * Event which fires when an action is dispatched.
     * Only intended for debugging purposes, don't use it for app logic.
     * This event will be emitted before state changes have been applied.
     */
    __unsafe_action__: {
        data: {
            /**
             * The action object which was dispatched.
             */
            action: any;
            /**
             * Whether the action was a no-op, i.e. resulted any state changes.
             */
            noop: boolean;
            /**
             * Stack trace of the action, this will only be available during development.
             */
            stack: string | undefined;
        };
    };
};

export declare type EventConsumer<EventMap extends EventMapBase> = {
    /**
     * Subscribe to events from the parent navigator.
     *
     * @param type Type of the event (e.g. `focus`, `blur`)
     * @param callback Callback listener which is executed upon receiving the event.
     */
    addListener<EventName extends Extract<keyof EventMap, string>>(
        type: EventName,
        callback: (...args: any[]) => any
    ): () => void;
    removeListener<EventName extends Extract<keyof EventMap, string>>(
        type: EventName,
        callback: (...args: any[]) => any
    ): void;
};

export declare type EventMapBase = Record<
    string,
    {
        data?: any;
        canPreventDefault?: boolean;
    }
>;

/**
 * NavigationListener
 */

export declare type NavigationListener = (
    event: EventArg<string, boolean, any>
) => void | null;

export declare type EventArg<
    EventName extends string,
    CanPreventDefault extends boolean | undefined = false,
    Data = undefined
> = {
    /**
     * Type of the event (e.g. `focus`, `blur`)
     */
    readonly type: EventName;
    readonly target?: string;
} & (CanPreventDefault extends true
    ? {
          /**
           * Whether `event.preventDefault()` was called on this event object.
           */
          readonly defaultPrevented: boolean;
          /**
           * Prevent the default action which happens on this event.
           */
          preventDefault(): void;
      }
    : any) &
    (undefined extends Data
        ? {
              readonly data?: Readonly<Data>;
          }
        : {
              readonly data: Readonly<Data>;
          });
