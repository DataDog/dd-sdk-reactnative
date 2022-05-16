/* eslint-disable @typescript-eslint/ban-ts-comment */
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

// TODO: inject this as a global
function mocked<T extends (...args: any[]) => any>(item: T) {
    return (item as unknown) as jest.MockedFunction<typeof item>;
}

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
mocked(AppState.addEventListener).mockImplementation(
    appStateMock.addEventListener
);
mocked(AppState.removeEventListener).mockImplementation(
    appStateMock.removeEventListener
);

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();

beforeEach(() => {
    mocked(InternalLog.log).mockClear();
    jest.setTimeout(20000);
    mocked(DdRum.startView).mockClear();
    mocked(DdRum.stopView).mockClear();
    mocked(AppState.addEventListener).mockClear();
    mocked(AppState.removeEventListener).mockClear();
    appStateMock.removeAllListeners();
    mocked(BackHandler.exitApp).mockClear();

    // @ts-ignore
    DdRumReactNavigationTracking.registeredContainer = null;
    // @ts-ignore
    DdRumReactNavigationTracking.navigationStateChangeListener = null;
});

// Unit tests
describe('DdRumReactNavigationTracking', () => {
    describe('startTrackingViews', () => {
        it('sends a RUM ViewEvent when startTrackingViews', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef} />);

            // WHEN
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(1);
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'Home'
            );
        });

        it('sends a related RUM ViewEvent when switching screens { navigationContainer listener attached }', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            const { getByText } = render(
                <FakeNavigator1 navigationRef={navigationRef} />
            );
            const goToAboutButton = getByText('Go to About');
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // WHEN
            expect(goToAboutButton).toBeTruthy();
            fireEvent(goToAboutButton, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(2);
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'Home'
            );
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'About'
            );
        });

        it('sends a related RUM ViewEvent when switching screens { viewPredicate provided }', async () => {
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
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'custom_view_name'
            );
        });

        it('only registers once when startTrackingViews{ multiple times }', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            const { getByText } = render(
                <FakeNavigator1 navigationRef={navigationRef} />
            );
            const goToAboutButton = getByText('Go to About');
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // WHEN
            expect(goToAboutButton).toBeTruthy();
            fireEvent(goToAboutButton, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(2);
        });

        it('does nothing when startTrackingViews { undefined NavigationContainerRef ', async () => {
            // WHEN
            DdRumReactNavigationTracking.startTrackingViews(null);

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(0);
            expect(InternalLog.log).toHaveBeenCalledTimes(1);
            expect(InternalLog.log).toHaveBeenCalledWith(
                DdRumReactNavigationTracking.NULL_NAVIGATION_REF_ERROR_MESSAGE,
                'error'
            );
        });

        it('sends a RUM ViewEvent for each when startTrackingViews { multiple navigation containers when first not detached }', async () => {
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
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef1.current
            );
            // this call will be ignored, because only one NavigationContainer tracking is supported at the time
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef2.current
            );

            // WHEN
            expect(goToAboutButton1).toBeTruthy();
            expect(goToAboutButton2).toBeTruthy();
            fireEvent(goToAboutButton1, 'press');
            fireEvent(goToAboutButton2, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(2);
            expect(InternalLog.log).toHaveBeenCalledWith(
                DdRumReactNavigationTracking.NAVIGATION_REF_IN_USE_ERROR_MESSAGE,
                'error'
            );
        });

        it('sends a RUM ViewEvent for each when switching screens { multiple navigation containers }', async () => {
            // GIVEN
            const navigationRef1 = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef1} />);
            const navigationRef2 = createRef<NavigationContainerRef>();
            render(<FakeNavigator2 navigationRef={navigationRef2} />);

            // WHEN
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef1.current
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef2.current
            );

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

        it('sends a RUM ViewEvent for each when switching screens { nested navigation containers }', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            const testUtils: { getByText } = render(
                <FakeNestedNavigator navigationRef={navigationRef} />
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );
            const goToAboutButton = testUtils.getByText('Go to About');

            // WHEN
            expect(goToAboutButton).toBeTruthy();
            fireEvent(goToAboutButton, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(2);
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'Home'
            );
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'About'
            );
        });
    });

    describe('stopTrackingViews', () => {
        it('does nothing when switching screens { navigationContainer listener detached }', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            const { getByText } = render(
                <FakeNavigator1 navigationRef={navigationRef} />
            );
            const goToAboutButton = getByText('Go to About');
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // WHEN
            DdRumReactNavigationTracking.stopTrackingViews(
                navigationRef.current
            );
            expect(goToAboutButton).toBeTruthy();
            fireEvent(goToAboutButton, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(1);
        });

        it('sends a RUM ViewEvent for each when startTrackingViews { multiple navigation containers when first is detached }', async () => {
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

            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef1.current
            );
            fireEvent(goToAboutButton1, 'press');
            DdRumReactNavigationTracking.stopTrackingViews(
                navigationRef1.current
            );

            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef2.current
            );

            const navigationRef2StartRoute = navigationRef2.current.getCurrentRoute();

            fireEvent(goToAboutButton2, 'press');

            // THEN
            expect(DdRum.startView).toHaveBeenCalledTimes(4);
            expect(DdRum.startView).toHaveBeenCalledWith(
                navigationRef2StartRoute.key,
                'Home'
            );
            expect(DdRum.startView).toHaveBeenCalledWith(
                navigationRef2.current?.getCurrentRoute()?.key,
                'About'
            );
        });
    });

    describe('AppState listener', () => {
        it('registers and unregisters AppState', async () => {
            // GIVEN
            const navigationRef1 = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef1} />);
            const navigationRef2 = createRef<NavigationContainerRef>();
            render(<FakeNavigator2 navigationRef={navigationRef2} />);

            // WHEN
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef1.current
            );
            DdRumReactNavigationTracking.stopTrackingViews(
                navigationRef1.current
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef2.current
            );

            // THEN
            expect(AppState.addEventListener).toHaveBeenCalledTimes(2);
            expect(AppState.removeEventListener).toHaveBeenCalledTimes(1);

            // WHEN we go in background mode
            appStateMock.changeValue('background');

            // THEN the listener is only called once
            expect(DdRum.stopView).toHaveBeenCalledTimes(1);
        });

        it('does not log AppState changes when tracking is stopped', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef} />);

            // WHEN
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );
            DdRumReactNavigationTracking.stopTrackingViews(
                navigationRef.current
            );
            appStateMock.changeValue('background');

            // THEN
            expect(DdRum.stopView).not.toHaveBeenCalled();
            expect(InternalLog.log).not.toHaveBeenCalledWith(
                'We could not determine the route when changing the application state to: background. No RUM View event will be sent in this case.',
                'error'
            );
        });

        it('stops active view when app goes into background', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef} />);

            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // WHEN
            appStateMock.changeValue('background');

            // THEN
            expect(DdRum.stopView).toHaveBeenCalledTimes(1);
            expect(DdRum.stopView).toHaveBeenCalledWith(
                navigationRef.current?.getCurrentRoute()?.key
            );
            expect(typeof navigationRef.current?.getCurrentRoute()?.key).toBe(
                'string'
            );
        });

        it('starts last view when app goes into foreground', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef} />);

            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );

            // WHEN
            appStateMock.changeValue('background');
            appStateMock.changeValue('active');

            // THEN
            expect(DdRum.stopView).toHaveBeenCalledTimes(1);
            expect(DdRum.startView).toHaveBeenCalledTimes(2);
        });

        it('does not stop view when no navigator attached', async () => {
            // GIVEN
            const navigationRef = createRef<NavigationContainerRef>();
            render(<FakeNavigator1 navigationRef={navigationRef} />);

            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef.current
            );
            DdRumReactNavigationTracking.stopTrackingViews(
                navigationRef.current
            );

            // WHEN
            appStateMock.changeValue('background');

            // THEN
            expect(DdRum.stopView).not.toHaveBeenCalled();
        });
    });

    describe('Android back handler', () => {
        it('does not send an error when the app closes with Android back button', async () => {
            // GIVEN
            const navigationRef1 = createRef<NavigationContainerRef>();
            const { unmount } = render(
                <FakeNavigator1 navigationRef={navigationRef1} />
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef1.current
            );

            // WHEN back is pressed
            mockBackHandler.mockPressBack();
            // THEN app is closed
            expect(BackHandler.exitApp).toHaveBeenCalled();

            // WHEN app is restarted and we navigate
            unmount();
            const navigationRef2 = createRef<NavigationContainerRef>();
            const { getByText } = render(
                <FakeNavigator2 navigationRef={navigationRef2} />
            );
            DdRumReactNavigationTracking.startTrackingViews(
                navigationRef2.current
            );
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
    });
});
