/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRumErrorTracking } from '@datadog/mobile-react-native/internal';

import { DdRum } from '../src/DdRumVega';
import { configureErrorTracking } from '../src/ErrorTracking';

it('starts automatic errors only when enabled in RUM settings', () => {
    const start = jest
        .spyOn(DdRumErrorTracking, 'startTracking')
        .mockImplementation(() => undefined);
    configureErrorTracking({});
    configureErrorTracking({ rumConfiguration: {} });
    configureErrorTracking({ rumConfiguration: { trackErrors: false } });
    configureErrorTracking({
        trackErrors: true,
        rumConfiguration: { trackErrors: false }
    });
    expect(start).not.toHaveBeenCalled();
    configureErrorTracking({ rumConfiguration: { trackErrors: true } });
    expect(start).toHaveBeenCalledWith(DdRum);
    configureErrorTracking({ trackErrors: true });
    expect(start).toHaveBeenCalledTimes(2);
    start.mockRestore();
});
