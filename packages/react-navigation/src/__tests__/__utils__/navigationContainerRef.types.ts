/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    NavigationContainerEventMap,
    NavigationContainerRef
} from '../../rum/instrumentation/react-navigation';

type ContainerMethods = {
    canGoBack(): boolean;
    getCurrentRoute():
        | Readonly<{ key: string; name: string; params?: object }>
        | undefined;
};

type ContainerRef<EventName extends string> = ContainerMethods & {
    addListener<Name extends EventName>(
        type: Name,
        callback: (event: {
            readonly type: Name;
            readonly data: unknown;
        }) => void
    ): () => void;
    removeListener<Name extends EventName>(
        type: Name,
        callback: (event: {
            readonly type: Name;
            readonly data: unknown;
        }) => void
    ): void;
};

type StateOnlyRef = ContainerRef<'state'>;

// Compiled, not executed: valid refs must compile, and invalid refs must stay rejected.
export const checkNavigationContainerRefTypes = (
    stateOnlyRef: StateOnlyRef,
    widerRef: ContainerRef<keyof NavigationContainerEventMap>,
    missingCanGoBack: Omit<StateOnlyRef, 'canGoBack'>,
    missingCurrentRoute: Omit<StateOnlyRef, 'getCurrentRoute'>,
    optionsOnlyRef: ContainerRef<'options'>
) => {
    const refs: (NavigationContainerRef | null)[] = [
        stateOnlyRef,
        widerRef,
        null
    ];

    // @ts-expect-error Android back handling requires canGoBack.
    refs.push(missingCanGoBack);
    // @ts-expect-error View tracking requires getCurrentRoute.
    refs.push(missingCurrentRoute);
    // @ts-expect-error Tracking requires state events, not just other events.
    refs.push(optionsOnlyRef);

    return refs;
};
