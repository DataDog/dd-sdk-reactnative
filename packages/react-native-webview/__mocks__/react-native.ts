/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PartialNativeDdSdkSpec } from '../src/NativeDdSdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const actualRN = require('react-native');

actualRN.NativeModules.DdSdk = {
    telemetryError: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<PartialNativeDdSdkSpec['telemetryError']>,
    consumeWebviewEvent: jest.fn().mockImplementation(
        () => new Promise<void>(resolve => resolve())
    ) as jest.MockedFunction<PartialNativeDdSdkSpec['consumeWebviewEvent']>
};

module.exports = actualRN;
