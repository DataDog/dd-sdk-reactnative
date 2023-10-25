/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { NativeSessionReplayType } from './nativeModulesTypes';

export class SessionReplayWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    private nativeSessionReplay: NativeSessionReplayType = require('./specs/NativeDdSessionReplay')
        .default;

    enable = (): Promise<void> => {
        return this.nativeSessionReplay.enable();
    };
}

export const SessionReplay = new SessionReplayWrapper();
