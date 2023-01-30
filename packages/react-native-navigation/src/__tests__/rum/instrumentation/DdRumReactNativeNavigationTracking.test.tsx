/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '@datadog/mobile-react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
    ApplicationMock,
    mockNativeComponents,
    VISIBLE_SCREEN_TEST_ID
} from 'react-native-navigation/Mock';
import type { ComponentDidAppearEvent } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';
import { Button } from 'react-native';
import React from 'react';

import type { ViewNamePredicate } from '../../../rum/instrumentation/DdRumReactNativeNavigationTracking';
import { DdRumReactNativeNavigationTracking } from '../../../rum/instrumentation/DdRumReactNativeNavigationTracking';

const flushPromises = () => new Promise(setImmediate);

jest.mock('@datadog/mobile-react-native', () => {
    return {
        DdRum: {
            startView: jest.fn().mockImplementation(() => {}),
            stopView: jest.fn().mockImplementation(() => {})
        }
    };
});

const startPlayground = () => {
    Navigation.registerComponent('Home', () => HomeScreen);
    Navigation.registerComponent('About', () => AboutScreen);
    Navigation.events().registerAppLaunchedListener(async () => {
        Navigation.setRoot({
            root: {
                stack: {
                    children: [{ component: { name: 'Home' } }]
                }
            }
        });
    });
};

const HomeScreen = props => {
    return (
        <>
            <Button
                title="Go to About"
                onPress={() => {
                    Navigation.push(props.componentId, {
                        component: { name: 'About' }
                    });
                }}
            />
        </>
    );
};

const AboutScreen = props => {
    return (
        <>
            <Button
                title="Go to Home"
                onPress={() =>
                    Navigation.push(props.componentId, {
                        component: { name: 'Home' }
                    })
                }
            />
        </>
    );
};

beforeEach(() => {
    jest.clearAllMocks();
    mockNativeComponents();
});

afterEach(() => {
    DdRumReactNativeNavigationTracking.stopTracking();
});

// Unit tests

it('M send a RUM ViewEvent W startTracking() for the first view', async () => {
    // GIVEN
    DdRumReactNativeNavigationTracking.startTracking();

    // WHEN
    render(<ApplicationMock entryPoint={() => startPlayground()} />);

    // THEN
    await waitFor(() =>
        expect(DdRum.startView).toHaveBeenCalledWith(expect.any(String), 'Home')
    );
});

it('M send a RUM ViewEvent W startTracking() componentDidAppear { custom viewPredicate }', async () => {
    // GIVEN
    const predicate: ViewNamePredicate = function (
        _event: ComponentDidAppearEvent,
        _trackedName: string
    ) {
        if (_trackedName === 'About') {
            return 'customViewName';
        }
        return _trackedName;
    };
    DdRumReactNativeNavigationTracking.startTracking(predicate);

    // WHEN
    const { findByText } = render(
        <ApplicationMock entryPoint={() => startPlayground()} />
    );
    const button = await findByText('Go to About');
    await fireEvent(button, 'press');

    // THEN
    await waitFor(() => expect(DdRum.startView).toHaveBeenCalledTimes(2));
    expect(DdRum.startView).toHaveBeenCalledWith(expect.any(String), 'Home');
    expect(DdRum.startView).toHaveBeenCalledWith(
        expect.any(String),
        'customViewName'
    );
});

it('M not send a RUM ViewEvent W startTracking() componentDidAppear { viewPredicate returns null }', async () => {
    // GIVEN
    let viewDropped = false;
    const predicate: ViewNamePredicate = function (
        _event: ComponentDidAppearEvent,
        _trackedName: string
    ) {
        if (_trackedName === 'About') {
            viewDropped = true;
            return null;
        }
        return _trackedName;
    };
    DdRumReactNativeNavigationTracking.startTracking(predicate);

    // WHEN
    const { findByText } = render(
        <ApplicationMock entryPoint={() => startPlayground()} />
    );
    const button = await findByText('Go to About');
    await fireEvent(button, 'press');
    await waitFor(() => viewDropped);

    // THEN
    expect(DdRum.startView).toHaveBeenCalledTimes(1);
    expect(DdRum.startView).toHaveBeenCalledWith(expect.any(String), 'Home');
});

it('M send a RUM stop view event when the app goes in background', async () => {
    // // GIVEN
    // const componentId = 'component42';
    // DdRumReactNativeNavigationTracking.startTracking();
    // // WHEN
    // React.createElement('View', {
    //     componentId
    // });
    // const listener = mockRegisterComponentListener.mock.calls[0][0];
    // listener.componentDidDisappear();
    // // THEN
    // expect(DdRum.stopView.mock.calls.length).toBe(1);
    // expect(DdRum.stopView.mock.calls[0][0]).toBe(componentId);
    // expect(DdRum.stopView.mock.calls[0][1]).toBeUndefined();
});
