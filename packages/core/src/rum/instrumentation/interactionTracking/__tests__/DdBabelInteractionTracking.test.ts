/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { RumActionType } from '../../../types';
import { DdBabelInteractionTracking } from '../DdBabelInteractionTracking';

jest.mock('../../../../specs/NativeDdSdk', () => ({
    __esModule: true,
    default: {
        sendTelemetryLog: jest.fn(),
        telemetryError: jest.fn()
    }
}));

jest.mock('../../../../utils/time-provider/DefaultTimeProvider', () => ({
    DefaultTimeProvider: jest.fn().mockImplementation(() => ({
        now: jest.fn().mockReturnValue(456)
    }))
}));

const mockTargetObject = {
    getContent: undefined,
    options: { useContent: true, useNamePrefix: true },
    handlerArgs: [],
    componentName: 'Button',
    'dd-action-name': [],
    accessibilityLabel: []
};

describe('DdBabelInteractionTracking.wrapRumAction', () => {
    it('should not crash when func is undefined', () => {
        const wrapped = DdBabelInteractionTracking.wrapRumAction(
            undefined as any,
            RumActionType.TAP,
            mockTargetObject
        );

        expect(() => wrapped()).not.toThrow();
        expect(wrapped()).toBeUndefined();
    });

    it('should not crash when func is null', () => {
        const wrapped = DdBabelInteractionTracking.wrapRumAction(
            null as any,
            RumActionType.TAP,
            mockTargetObject
        );

        expect(() => wrapped()).not.toThrow();
        expect(wrapped()).toBeUndefined();
    });

    it('should call func when it is defined', () => {
        const func = jest.fn().mockReturnValue('result');
        const wrapped = DdBabelInteractionTracking.wrapRumAction(
            func,
            RumActionType.TAP,
            mockTargetObject
        );

        const result = wrapped('arg1', 'arg2');

        expect(func).toHaveBeenCalledWith('arg1', 'arg2');
        expect(result).toBe('result');
    });
});
