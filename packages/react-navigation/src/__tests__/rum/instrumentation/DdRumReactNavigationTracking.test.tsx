/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '@datadog/mobile-react-native/internal';
import { DdRum } from '@datadog/mobile-react-native';
import type { NavigationContainerRef, Route } from '@react-navigation/native';
import { render, fireEvent } from '@testing-library/react-native';
import mockBackHandler from 'react-native/Libraries/Utilities/__mocks__/BackHandler.js';
import { AppState, BackHandler } from 'react-native';
import React, { createRef } from 'react';

import type { ViewNamePredicate } from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { DdRumReactNavigationTracking } from '../../../rum/instrumentation/DdRumReactNavigationTracking';

import { AppStateMock } from './__utils__/AppStateMock';
import {
    FakeNavigator1,
    FakeNavigator2,
    FakeNestedNavigator
} from './__utils__/Navigators/NavigatorsV5';

jest.mock(
    'react-native/Libraries/Utilities/BackHandler',
    () => mockBackHandler
);

jest.mock('@datadog/mobile-react-native/internal', () => {
    return {
        InternalLog: {
            log: jest.fn()
        }
    };
});

jest.mock('@datadog/mobile-react-native', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            startView: jest.fn().mockImplementation(() => {}),
            stopView: jest.fn().mockImplementation(() => {})
        },
        SdkVerbosity: {
            DEBUG: 'debug',
            INFO: 'info',
            WARN: 'warn',
            ERROR: 'error'
        }
    };
});

const appStateMock = new AppStateMock();
AppState.addEventListener.mockImplementation(appStateMock.addEventListener);
AppState.removeEventListener.mockImplementation(
    appStateMock.removeEventListener
);

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();

beforeEach(() => {
    InternalLog.log.mockClear();
    jest.setTimeout(20000);
    DdRum.startView.mockClear();
    DdRum.stopView.mockClear();
    AppState.addEventListener.mockClear();
    AppState.removeEventListener.mockClear();
    appStateMock.removeAllListeners();
    BackHandler.exitApp.mockClear();

    DdRumReactNavigationTracking.registeredContainer = null;
    DdRumReactNavigationTracking.navigationStateChangeListener = null;
});

// Unit tests

it('M send a RUM ViewEvent W startTrackingViews', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef} />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls[0][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[0][1]).toBe(
        navigationRef.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[0][2]).toBeUndefined();
});

it('M send a related RUM ViewEvent W switching screens { navigationContainer listener attached }', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    const { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef} />
    );
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[1][1]).toBe(
        navigationRef.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[1][2]).toBeUndefined();
});

it('M send a related RUM ViewEvent W switching screens { viewPredicate provided }', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    const { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef} />
    );
    const goToAboutButton = getByText('Go to About');
    const customViewName = 'custom_view_name';
    const predicate: ViewNamePredicate = function (
        _route: Route<string, any | undefined>,
        _trackedName: string
    ) {
        return customViewName;
    };
    DdRumReactNavigationTracking.startTrackingViews(
        navigationRef.current,
        predicate
    );

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[1][1]).toBe(customViewName);
    expect(DdRum.startView.mock.calls[1][2]).toBeUndefined();
});

it('M only register once W startTrackingViews{ multiple times }', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    const { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef} />
    );
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[1][1]).toBe(
        navigationRef.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[1][2]).toBeUndefined();
});

it('M do nothing W switching screens { navigationContainer listener detached }', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    const { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef} />
    );
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // WHEN
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
});

it('M do nothing W startTrackingViews { undefined NavigationContainerRef ', async () => {
    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(null);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(0);
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdRumReactNavigationTracking.NULL_NAVIGATION_REF_ERROR_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe('error');
});

it('M send a RUM ViewEvent for each W startTrackingViews { multiple navigation containers w first not detached }', async () => {
    // GIVEN
    const navigationRef1 = createRef<NavigationContainerRef>();
    const testUtils1: { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef1} />
    );
    const goToAboutButton1 = testUtils1.getByText('Go to About');
    const navigationRef2 = createRef<NavigationContainerRef>();
    const testUtils2: { getByText } = render(
        <FakeNavigator2 navigationRef={navigationRef2} />
    );
    const goToAboutButton2 = testUtils2.getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    // this call will be ignored, because only one NavigationContainer tracking is supported at the time
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // WHEN
    expect(goToAboutButton1).toBeTruthy();
    expect(goToAboutButton2).toBeTruthy();
    fireEvent(goToAboutButton1, 'press');
    fireEvent(goToAboutButton2, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(
        navigationRef1.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[1][1]).toBe(
        navigationRef1.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[1][2]).toBeUndefined();
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdRumReactNavigationTracking.NAVIGATION_REF_IN_USE_ERROR_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe('error');
});

it('M send a RUM ViewEvent for each W startTrackingViews { multiple navigation containers w first is detached }', async () => {
    // GIVEN
    const navigationRef1 = createRef<NavigationContainerRef>();
    const testUtils1: { getByText } = render(
        <FakeNavigator1 navigationRef={navigationRef1} />
    );
    const goToAboutButton1 = testUtils1.getByText('Go to About');
    const navigationRef2 = createRef<NavigationContainerRef>();
    const testUtils2: { getByText } = render(
        <FakeNavigator2 navigationRef={navigationRef2} />
    );
    const goToAboutButton2 = testUtils2.getByText('Go to About');

    // WHEN
    expect(goToAboutButton1).toBeTruthy();
    expect(goToAboutButton2).toBeTruthy();

    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    fireEvent(goToAboutButton1, 'press');
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    const navigationRef2StartRoute = navigationRef2.current.getCurrentRoute();

    fireEvent(goToAboutButton2, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(4);
    expect(DdRum.startView.mock.calls[2][0]).toBe(navigationRef2StartRoute.key);
    expect(DdRum.startView.mock.calls[2][1]).toBe(
        navigationRef2StartRoute.name
    );
    expect(DdRum.startView.mock.calls[2][2]).toBeUndefined();
    expect(DdRum.startView.mock.calls[3][0]).toBe(
        navigationRef2.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[3][1]).toBe(
        navigationRef2.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[3][2]).toBeUndefined();
});

it('M send a RUM ViewEvent for each W switching screens { multiple navigation containers }', async () => {
    // GIVEN
    const navigationRef1 = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef1} />);
    const navigationRef2 = createRef<NavigationContainerRef>();
    render(<FakeNavigator2 navigationRef={navigationRef2} />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls[0][0]).toBe(
        navigationRef1.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[0][1]).toBe(
        navigationRef1.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[0][2]).toBeUndefined();
    expect(InternalLog.log.mock.calls.length).toBe(1);
    expect(InternalLog.log.mock.calls[0][0]).toBe(
        DdRumReactNavigationTracking.NAVIGATION_REF_IN_USE_ERROR_MESSAGE
    );
    expect(InternalLog.log.mock.calls[0][1]).toBe('error');
});

it('M register and unregister AppState', async () => {
    // GIVEN
    const navigationRef1 = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef1} />);
    const navigationRef2 = createRef<NavigationContainerRef>();
    render(<FakeNavigator2 navigationRef={navigationRef2} />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // THEN
    expect(AppState.addEventListener.mock.calls.length).toBe(2);
    expect(AppState.removeEventListener.mock.calls.length).toBe(1);

    // WHEN we go in background mode
    appStateMock.changeValue('background');

    // THEN the listener is only called once
    expect(DdRum.stopView).toHaveBeenCalledTimes(1);
});

it('M not log AppState changes W tracking is stopped', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef} />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);
    appStateMock.changeValue('background');

    // THEN
    expect(DdRum.stopView).not.toHaveBeenCalled();
    expect(InternalLog.log).not.toHaveBeenCalledWith(
        'We could not determine the route when changing the application state to: background. No RUM View event will be sent in this case.',
        'error'
    );
});

it('M stop active view W app goes into background', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef} />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // WHEN
    appStateMock.changeValue('background');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(1);
    expect(DdRum.stopView.mock.calls[0][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.stopView.mock.calls[0][1]).toBeUndefined();
});

it('M start last view W app goes into foreground', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef} />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

    // WHEN
    appStateMock.changeValue('background');
    appStateMock.changeValue('active');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[0][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[0][1]).toBe(
        navigationRef.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[0][2]).toBeUndefined();
});

it('M not stop view W no navigator attached', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    render(<FakeNavigator1 navigationRef={navigationRef} />);

    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);

    // WHEN
    appStateMock.changeValue('background');

    // THEN
    expect(DdRum.stopView.mock.calls.length).toBe(0);
});

it('M send a RUM ViewEvent for each W switching screens { nested navigation containers }', async () => {
    // GIVEN
    const navigationRef = createRef<NavigationContainerRef>();
    const testUtils: { getByText } = render(
        <FakeNestedNavigator navigationRef={navigationRef} />
    );
    DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    const goToAboutButton = testUtils.getByText('Go to About');
    const initialRoute = navigationRef.current?.getCurrentRoute();

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, 'press');

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[0][0]).toBe(initialRoute?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(initialRoute?.name);
    expect(DdRum.startView.mock.calls[0][2]).toBeUndefined();
    expect(DdRum.startView.mock.calls[1][0]).toBe(
        navigationRef.current?.getCurrentRoute()?.key
    );
    expect(DdRum.startView.mock.calls[1][1]).toBe(
        navigationRef.current?.getCurrentRoute()?.name
    );
    expect(DdRum.startView.mock.calls[1][2]).toBeUndefined();
});

it('M not send an error W the app closes with Android back button', async () => {
    // GIVEN
    const navigationRef1 = createRef<NavigationContainerRef>();
    const { unmount } = render(
        <FakeNavigator1 navigationRef={navigationRef1} />
    );
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN back is pressed
    BackHandler.mockPressBack();
    // THEN app is closed
    expect(BackHandler.exitApp).toHaveBeenCalled();

    // WHEN app is restarted and we navigate
    unmount();
    const navigationRef2 = createRef<NavigationContainerRef>();
    const { getByText } = render(
        <FakeNavigator2 navigationRef={navigationRef2} />
    );
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);
    const goToAboutButton = getByText('Go to About');
    fireEvent(goToAboutButton, 'press');

    // THEN new navigation is attached, no error and message is sent
    expect(DdRum.startView).toHaveBeenLastCalledWith(
        expect.any(String),
        'About'
    );
    expect(InternalLog.log).not.toHaveBeenCalledWith(
        DdRumReactNavigationTracking.NAVIGATION_REF_IN_USE_ERROR_MESSAGE,
        'error'
    );
});
