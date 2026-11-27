/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getNativeDdSdk } from '../../../../specs/NativeDdSdk';
import { RumActionType } from '../../../types';
import { DdBabelInteractionTracking } from '../DdBabelInteractionTracking';

jest.mock('../../../../specs/NativeDdSdk', () => ({
    getNativeDdSdk: jest.fn()
}));

const target = {
    getContent: undefined,
    options: { useContent: true, useNamePrefix: true },
    handlerArgs: [],
    componentName: 'Button',
    'dd-action-name': [],
    accessibilityLabel: []
};
const wrap = (handler: jest.Mock) =>
    DdBabelInteractionTracking.wrapRumAction(
        handler,
        RumActionType.TAP,
        target
    );

beforeEach(() => {
    DdBabelInteractionTracking['telemetrySent'] = false;
    DdBabelInteractionTracking.config.trackInteractions = false;
    (getNativeDdSdk as jest.Mock).mockReset().mockReturnValue({});
});

it.each(['missing', 'throwing', 'rejecting'])(
    'keeps the app handler working with %s telemetry',
    async failure => {
        const sendTelemetryLog =
            failure === 'missing'
                ? undefined
                : jest.fn(() => {
                      if (failure === 'throwing') {
                          throw Error('telemetry unavailable');
                      }
                      return Promise.reject(Error('telemetry failed'));
                  });
        (getNativeDdSdk as jest.Mock).mockReturnValue({ sendTelemetryLog });
        const handler = jest.fn().mockReturnValue('navigated');
        const press = wrap(handler);
        expect(press('route')).toBe('navigated');
        await Promise.resolve();
        expect(handler).toHaveBeenCalledWith('route');
    }
);

it('does not reject when reporting a failed action through missing error telemetry', async () => {
    const addAction = jest.fn().mockRejectedValue(Error('action unavailable'));
    DdBabelInteractionTracking.attachRumInstance({ addAction } as any);
    DdBabelInteractionTracking.config.trackInteractions = true;
    const handler = jest.fn();
    expect(() => wrap(handler)()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(addAction).toHaveBeenCalledTimes(1);
});
