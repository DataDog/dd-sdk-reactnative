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

    it('should forward the first handler argument as actionContext to DdRum.addAction', () => {
        const mockAddAction = jest.fn().mockResolvedValue(undefined);
        DdBabelInteractionTracking.config = {
            trackInteractions: true,
            useAccessibilityLabel: true
        };
        DdBabelInteractionTracking.attachRumInstance({
            addAction: mockAddAction
        } as any);

        const func = jest.fn();
        const wrapped = DdBabelInteractionTracking.wrapRumAction(
            func,
            RumActionType.TAP,
            mockTargetObject
        );

        const event = {
            nativeEvent: { target: 42, locationX: 10, locationY: 20 }
        };
        wrapped(event);

        expect(mockAddAction).toHaveBeenCalledWith(
            RumActionType.TAP,
            expect.any(String),
            expect.anything(),
            expect.any(Number),
            event
        );
    });

    describe('action naming precedence', () => {
        const mockAddAction = jest.fn().mockResolvedValue(undefined);
        const originalConfig = DdBabelInteractionTracking.config;

        beforeEach(() => {
            mockAddAction.mockClear();
            DdBabelInteractionTracking.attachRumInstance({
                addAction: mockAddAction
            } as any);
        });

        afterEach(() => {
            DdBabelInteractionTracking.config = originalConfig;
        });

        describe.each([true, false])(
            'useAccessibilityLabel=%s',
            useAccessibilityLabel => {
                it.each([
                    {
                        source:
                            'dd-action-name over custom attribute, accessibility label and content',
                        attributes: {
                            'dd-action-name': ['Explicit'],
                            customName: ['Custom'],
                            accessibilityLabel: ['Accessible']
                        },
                        content: ['Content'],
                        expected: 'Pressable ("Explicit")'
                    },
                    {
                        source:
                            'custom attribute over accessibility label and content',
                        attributes: {
                            customName: ['Custom'],
                            accessibilityLabel: ['Accessible']
                        },
                        content: ['Content'],
                        expected: 'Pressable ("Custom")'
                    },
                    {
                        source:
                            'accessibility label or content according to configuration',
                        attributes: { accessibilityLabel: ['Accessible'] },
                        content: ['Content'],
                        expected: useAccessibilityLabel
                            ? 'Pressable ("Accessible")'
                            : 'Pressable ("Content")'
                    },
                    {
                        source:
                            'accessibility label or component name when there is no content',
                        attributes: { accessibilityLabel: ['Edit'] },
                        content: [],
                        expected: useAccessibilityLabel
                            ? 'Pressable ("Edit")'
                            : 'Pressable'
                    },
                    {
                        source: 'content when there are no naming attributes',
                        attributes: {},
                        content: ['Content'],
                        expected: 'Pressable ("Content")'
                    },
                    {
                        source:
                            'component name when there are no naming attributes or content',
                        attributes: {},
                        content: [],
                        expected: 'Pressable'
                    }
                ])('uses $source', ({ attributes, content, expected }) => {
                    DdBabelInteractionTracking.config = {
                        trackInteractions: true,
                        useAccessibilityLabel
                    };
                    const wrapped = DdBabelInteractionTracking.wrapRumAction(
                        jest.fn(),
                        RumActionType.TAP,
                        {
                            options: {
                                useContent: true,
                                useNamePrefix: true
                            },
                            handlerArgs: [],
                            componentName: 'Pressable',
                            getContent: () => content,
                            ...attributes
                        } as any
                    );

                    wrapped();

                    expect(mockAddAction).toHaveBeenCalledTimes(1);
                    expect(mockAddAction.mock.calls[0][1]).toBe(expected);
                });
            }
        );
    });
});
