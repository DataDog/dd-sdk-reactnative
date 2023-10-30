/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * We have to redefine the spec for the Native SDK here to be able to use the new architecture.
 * We don't declare it in a spec file so we don't end up with a duplicate definition of the native module.
 */
interface PartialNativeDdSdkSpec extends TurboModule {
    consumeWebviewEvent(message: string): Promise<void>;
    telemetryError(message: string, stack: string, kind: string): Promise<void>;
}
export const NativeDdSdk = TurboModuleRegistry.get<PartialNativeDdSdkSpec>(
    'DdSdk'
);
