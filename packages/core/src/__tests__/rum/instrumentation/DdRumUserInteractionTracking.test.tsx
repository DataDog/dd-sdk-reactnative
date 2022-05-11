/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render, fireEvent } from '@testing-library/react-native';
import {
    View,
    Text,
    Button,
    TouchableOpacity,
    TouchableHighlight,
    TouchableNativeFeedback,
    TouchableWithoutFeedback,
    StyleSheet
} from 'react-native';
import React from 'react';

import { DdEventsInterceptor } from '../../../rum/instrumentation/DdEventsInterceptor';
import { DdRumUserInteractionTracking } from '../../../rum/instrumentation/DdRumUserInteractionTracking';

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 10
    }
});

jest.mock('../../../rum/instrumentation/DdEventsInterceptor');

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();

let originalMethod: Function;

beforeEach(() => {
    originalMethod = React.createElement;
    jest.setTimeout(20000);
});

afterEach(() => {
    DdRumUserInteractionTracking['isTracking'] = false;
    React.createElement = originalMethod;
});

// Because the way RN decouples the component we cannot assert how many times the `interceptOnPress` function was called.
// This problem is being handled at the EventInterceptor level.

it('M intercept and send a RUM event W onPress { Button component }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <Button
                title="Click me"
                accessibilityLabel="click_me_button"
                onPress={event => {}}
            />
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M intercept only once W startTracking { called multiple times }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    DdRumUserInteractionTracking.startTracking();
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <Button
                title="Click me"
                accessibilityLabel="click_me_button"
                onPress={event => {}}
            />
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M intercept and send a RUM event W onPress { TouchableOpacity component }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <TouchableOpacity
                style={styles.button}
                accessibilityLabel="click_me_touchable_opacity"
                onPress={event => {}}
            >
                <Text>Click me</Text>
            </TouchableOpacity>
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M intercept and send a RUM event W onPress { TouchableHighlight component }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <TouchableHighlight onPress={event => {}} underlayColor="white">
                <View style={styles.button}>
                    <Text>Click me</Text>
                </View>
            </TouchableHighlight>
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M intercept and send a RUM event W onPress { TouchableNativeFeedback component }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <TouchableNativeFeedback onPress={event => {}}>
                <View style={styles.button}>
                    <Text style={styles.button}>Click me</Text>
                </View>
            </TouchableNativeFeedback>
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M intercept and send a RUM event W onPress { TouchableWithoutFeedback component }', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    const { getByText } = render(
        <View>
            <TouchableWithoutFeedback onPress={event => {}}>
                <View style={styles.button}>
                    <Text style={styles.button}>Click me</Text>
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
    const testButton = getByText('Click me');

    // WHEN
    fireEvent(testButton, 'press');

    // THEN
    const currentMockedEventsInterceptor =
        DdEventsInterceptor.mock.instances[
            DdEventsInterceptor.mock.instances.length - 1
        ];
    const mockedInterceptOnPressFunction =
        currentMockedEventsInterceptor.interceptOnPress;
    expect(mockedInterceptOnPressFunction).toBeCalled();
});

it('M keep memoization working for elements W an onPress prop is passed', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    let rendersCount = 0;
    const DummyComponent = props => {
        rendersCount++;
        return (
            <TouchableWithoutFeedback onPress={props.onPress}>
                <View style={styles.button}>
                    <Text style={styles.button}>Click me</Text>
                </View>
            </TouchableWithoutFeedback>
        );
    };
    const stableOnPress = () => {};
    const MemoizedComponent = React.memo(DummyComponent);
    const { rerender } = render(<MemoizedComponent onPress={stableOnPress} />);
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={stableOnPress} />);
    // THEN
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={() => {}} />);
    // THEN
    expect(rendersCount).toBe(2);
});

it('M keep memoization working for elements W no onPress prop is passed', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    let rendersCount = 0;
    const DummyComponent = props => {
        rendersCount++;
        return (
            <View style={styles.button}>
                <Text style={styles.button}>{props.title}</Text>
            </View>
        );
    };
    const MemoizedComponent = React.memo(DummyComponent);
    const { rerender } = render(<MemoizedComponent title={'Click me'} />);
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent title={'Click me'} />);
    // THEN
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent title={'New title'} />);
    // THEN
    expect(rendersCount).toBe(2);
});

it('M keep memoization working for elements W an onPress prop is passed and custom arePropsEqual specified', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    let rendersCount = 0;
    const DummyComponent = props => {
        rendersCount++;
        return (
            <TouchableWithoutFeedback onPress={props.onPress}>
                <View style={styles.button}>
                    <Text style={styles.button}>{props.title}</Text>
                </View>
            </TouchableWithoutFeedback>
        );
    };
    const stableOnPress = () => {};
    const MemoizedComponent = React.memo(
        DummyComponent,
        (previousProps, nextProps) => previousProps.title === nextProps.title
    );
    const { rerender } = render(
        <MemoizedComponent onPress={stableOnPress} title={'Click me'} />
    );
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={stableOnPress} title={'Click me'} />);
    // THEN
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={stableOnPress} title={'New title'} />);
    // THEN
    expect(rendersCount).toBe(2);
});

it('M keep memoization working for elements W an onPress prop is passed and custom arePropsEqual specified including onPress check', async () => {
    // GIVEN
    DdRumUserInteractionTracking.startTracking();
    let rendersCount = 0;
    const DummyComponent = props => {
        rendersCount++;
        return (
            <TouchableWithoutFeedback onPress={props.onPress}>
                <View style={styles.button}>
                    <Text style={styles.button}>Click me</Text>
                </View>
            </TouchableWithoutFeedback>
        );
    };
    const stableOnPress = () => {};
    const MemoizedComponent = React.memo(
        DummyComponent,
        (previousProps, nextProps) =>
            previousProps.onPress === nextProps.onPress
    );
    const { rerender } = render(<MemoizedComponent onPress={stableOnPress} />);
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={stableOnPress} />);
    // THEN
    expect(rendersCount).toBe(1);

    // WHEN
    rerender(<MemoizedComponent onPress={() => {}} />);
    // THEN
    expect(rendersCount).toBe(2);
});
