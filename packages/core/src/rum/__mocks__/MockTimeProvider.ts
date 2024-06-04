/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Timestamp } from '../../utils/time-provider/TimeProvider';
import { TimeProvider } from '../../utils/time-provider/TimeProvider';

export default class MockTimeProvider extends TimeProvider {
    unixMockedTime: number;
    reactNativeMockedTime: number | null;

    constructor(unixMockedTime: number, reactNativeMockedTime: number | null) {
        super();
        this.unixMockedTime = unixMockedTime;
        this.reactNativeMockedTime = reactNativeMockedTime;
    }

    getTimestamp(): Timestamp {
        return {
            unix: this.unixMockedTime,
            reactNative: this.reactNativeMockedTime
        };
    }
}
