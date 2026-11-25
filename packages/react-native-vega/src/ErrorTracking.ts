/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRumErrorTracking } from '@datadog/mobile-react-native/internal';

import { DdRum } from './DdRumVega';

/** Called by SDK setup after configuring RUM. Defaults match core's trackErrors=false. */
export const configureErrorTracking = (configuration: {
    rumConfiguration?: { trackErrors?: boolean };
    trackErrors?: boolean;
}): void => {
    const enabled =
        configuration.rumConfiguration?.trackErrors ??
        configuration.trackErrors ??
        false;
    if (enabled) {
        DdRumErrorTracking.startTracking(DdRum);
    }
};
