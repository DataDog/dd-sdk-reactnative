/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeEventEmitter, Platform } from 'react-native';
import type { NativeModule } from 'react-native';

const EMPTY_NATIVE_MODULE: NativeModule = {
    addListener(_: string): void {
        /* empty */
    },
    removeListeners(_: number): void {
        /* empty */
    }
};

const nativeEventEmitters = new Map<NativeModule, NativeEventEmitter>();

/**
 * Default implementation for creating a NativeEventEmitter.
 * @param nativeModule The NativeModule for which the NativeEventEmitter is created for.
 * @returns The NativeEventEmitter.
 */
const createDefaultNativeEventEmitter = (
    nativeModule?: NativeModule
): NativeEventEmitter => {
    return new NativeEventEmitter(nativeModule);
};

/**
 * [INTERNAL API]
 * Creates a {@link NativeEventEmitter} from the given {@link NativeModule}.
 * @param nativeModule The {@link NativeModule} to create the {@link NativeEventEmitter} for.
 * @param createNativeEventEmitter Custom implementation for creating a {@link NativeEventEmitter}.
 * Defaults to {@link createDefaultNativeEventEmitter} (USEFUL FOR TESTING)
 * @returns The created {@link NativeEventEmitter}.
 */
export const createNativeEventEmitterForModule = (
    nativeModule: NativeModule,
    createNativeEventEmitter: (
        nativeEventModule?: NativeModule
    ) => NativeEventEmitter = createDefaultNativeEventEmitter
): NativeEventEmitter => {
    const eventEmitter = nativeEventEmitters.get(nativeModule);
    if (!eventEmitter) {
        const newEventEmitter =
            Platform.OS === 'android'
                ? createNativeEventEmitter()
                : createNativeEventEmitter(nativeModule ?? EMPTY_NATIVE_MODULE);
        nativeEventEmitters.set(nativeModule, newEventEmitter);
        return newEventEmitter;
    }
    return eventEmitter;
};
