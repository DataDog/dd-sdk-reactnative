/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../InternalLog';
import { SdkVerbosity } from '../../../SdkVerbosity';
import { DdRum } from '../../../index';
import {
    DdEventsInterceptor,
    RumActionType,
    UNKNOWN_TARGET_NAME
} from '../../../rum/instrumentation/DdEventsInterceptor';

jest.mock('../../../foundation', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addAction: jest.fn().mockImplementation(() => {})
        }
    };
});

jest.mock('../../../InternalLog', () => {
    return {
        InternalLog: {
            log: jest.fn()
        }
    };
});

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();

let testedEventsInterceptor: DdEventsInterceptor;

beforeEach(() => {
    testedEventsInterceptor = new DdEventsInterceptor();
    jest.setTimeout(20000);
    InternalLog.log.mockReset();
    DdRum.addAction.mockReset();
});

it('M send a RUM Action event W interceptOnPress { arguments with dd-action-name } ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = 'target_name';
    const fakeDdActionLabel = 'DdActionLabel';
    const fakeArguments = {
        _targetInst: {
            memoizedProps: {
                accessibilityLabel: fakeAccessibilityLabel,
                'dd-action-name': fakeDdActionLabel
            }
        }
    };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeDdActionLabel);
});

it('M send a RUM Action event W interceptOnPress { arguments with dd-action-name on a parent node} ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = 'target_name';
    const fakeDdActionLabel = 'DdActionLabel';
    const fakeArguments = {
        _targetInst: {
            memoizedProps: {
                accessibilityLabel: fakeAccessibilityLabel
            },
            return: {
                memoizedProps: {
                    accessibilityLabel: fakeAccessibilityLabel,
                    'dd-action-name': fakeDdActionLabel
                }
            }
        }
    };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeDdActionLabel);
});

it('M send a RUM Action event W interceptOnPress { arguments with accessibilityLabel } ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = 'target_name';
    const fakeArguments = {
        _targetInst: {
            memoizedProps: { accessibilityLabel: fakeAccessibilityLabel }
        }
    };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeAccessibilityLabel);
});

it('M send only one RUM Action event W interceptOnPress { called multiple times for same target } ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = 'target_name';
    const fakeArguments = {
        _targetInst: {
            memoizedProps: { accessibilityLabel: fakeAccessibilityLabel }
        }
    };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);
    testedEventsInterceptor.interceptOnPress(fakeArguments);
    testedEventsInterceptor.interceptOnPress(fakeArguments);
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeAccessibilityLabel);
});

it('M send a RUM Action event W interceptOnPress { no accessibilityLabel arguments, elementType is string } ', async () => {
    // GIVEN
    const fakeElementType = 'element_type';
    const fakeArguments = { _targetInst: { elementType: fakeElementType } };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeElementType);
});

it('M send a RUM Action event W interceptOnPress { no accessibilityLabel arguments, elementType is object with name property } ', async () => {
    // GIVEN
    const fakeElementType = 'element_type';
    const fakeArguments = {
        _targetInst: { elementType: { name: fakeElementType } }
    };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeElementType);
});

it('M send a RUM Action event W interceptOnPress { no accessibilityLabel, no elementType } ', async () => {
    // GIVEN
    const fakeArguments = { _targetInst: {} };

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1);
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf());
    expect(DdRum.addAction.mock.calls[0][1]).toBe(UNKNOWN_TARGET_NAME);
});

it('M do nothing W interceptOnPress { invalid arguments - empty object } ', async () => {
    // GIVEN
    const fakeArguments = {};

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { invalid arguments - array } ', async () => {
    // GIVEN
    const fakeArguments = [];

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { invalid arguments - nested array } ', async () => {
    // GIVEN
    const fakeArguments = [[]];

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { invalid arguments - undefined } ', async () => {
    // GIVEN
    const fakeArguments = undefined;

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { invalid arguments - null } ', async () => {
    // GIVEN
    const fakeArguments = null;

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments);

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { invalid arguments - wrong object } ', async () => {
    // WHEN
    testedEventsInterceptor.interceptOnPress({ a: 'b' });

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});

it('M do nothing W interceptOnPress { no arguments call } ', async () => {
    // WHEN
    testedEventsInterceptor.interceptOnPress();

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdEventsInterceptor.ACTION_EVENT_DROPPED_WARN_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe(SdkVerbosity.WARN);
});
