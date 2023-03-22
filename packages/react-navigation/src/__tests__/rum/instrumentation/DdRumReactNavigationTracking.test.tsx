/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum, InternalLog } from '@datadog/mobile-react-native';
import type { Route } from '@react-navigation/native-v5';
import { render, fireEvent } from '@testing-library/react-native';
import mockBackHandler from 'react-native/Libraries/Utilities/__mocks__/BackHandler.js';
import { AppState, BackHandler } from 'react-native';
import React, { createRef } from 'react';

import type { ViewNamePredicate } from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { DdRumReactNavigationTracking } from '../../../rum/instrumentation/DdRumReactNavigationTracking';

import { AppStateMockLegacy } from './__utils__/AppStateMockLegacy';
import { AppStateMock } from './__utils__/AppStateMock';
import {
    FakeNavigator1 as FakeNavigator1v5,
    FakeNavigator2 as FakeNavigator2v5,
    FakeNestedNavigator as FakeNestedNavigatorv5
} from './__utils__/Navigators/NavigatorsV5';
import {
    FakeNavigator1 as FakeNavigator1v6,
    FakeNavigator2 as FakeNavigator2v6,
    FakeNestedNavigator as FakeNestedNavigatorv6
} from './__utils__/Navigators/NavigatorsV6';

// TODO: inject this as a global
function mocked<T extends (...args: any[]) => any>(item: T) {
    return (item as unknown) as jest.MockedFunction<typeof item>;
}

jest.mock(
    'react-native/Libraries/Utilities/BackHandler',
    () => mockBackHandler
);

/**
 * Fix for @react-navigation/native v5 which calls the `Linking.removeEventListener` API
 * which has been removed in RN 0.71.
 */
jest.mock('react-native', () => {
    const reactNative = jest.requireActual('react-native');
    reactNative.Linking.removeEventListener = jest.fn();
    return reactNative;
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
        },
        InternalLog: {
            log: jest.fn()
        }
    };
});

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

beforeEach(() => {
    mocked(InternalLog.log).mockClear();
    jest.setTimeout(20000);
    mocked(DdRum.startView).mockClear();
    mocked(DdRum.stopView).mockClear();
    mocked(AppState.addEventListener).mockClear();
    mocked(BackHandler.exitApp).mockClear();

    // @ts-ignore
    DdRumReactNavigationTracking.registeredContainer = null;
    // @ts-ignore
    DdRumReactNavigationTracking.navigationStateChangeListener = null;
});

// Unit tests
describe.each([
    [
        '5',
        {
            FakeNavigator1: FakeNavigator1v5,
            FakeNavigator2: FakeNavigator2v5,
            FakeNestedNavigator: FakeNestedNavigatorv5
        }
    ],
    [
        '6',
        {
            FakeNavigator1: FakeNavigator1v6,
            FakeNavigator2: FakeNavigator2v6,
            FakeNestedNavigator: FakeNestedNavigatorv6
        }
    ]
])(
    'DdRumReactNavigationTracking on react-navigation v%s',
    (version, { FakeNavigator1, FakeNavigator2, FakeNestedNavigator }) => {
        describe('startTrackingViews', () => {
            it('sends a related RUM ViewEvent when switching screens { navigationContainer listener attached }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
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
                const navigationRef = createRef<any>();
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

            it('sends a related RUM ViewEvent when switching screens { viewPredicate returning context }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');
                const predicate: ViewNamePredicate = function (
                    _route: Route<string, any | undefined>,
                    _trackedName: string
                ) {
                    return {
                        name: 'custom_view_name',
                        context: _route.params
                    };
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
                    'custom_view_name',
                    {
                        user: 'super-user'
                    }
                );
            });

            it('sends a related RUM ViewEvent when switching screens { viewPredicate returns null }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');
                const predicate: ViewNamePredicate = function (
                    _route: Route<string, any | undefined>,
                    _trackedName: string
                ) {
                    return null;
                };
                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    predicate
                );

                // WHEN
                expect(goToAboutButton).toBeTruthy();
                fireEvent(goToAboutButton, 'press');

                // THEN
                expect(DdRum.startView).not.toHaveBeenCalled();
            });

            it('only registers once when startTrackingViews{ multiple times }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
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

            it('does nothing when startTrackingViews { undefined any ', async () => {
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
                const navigationRef1 = createRef<any>();
                const testUtils1: { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef1} />
                );
                const goToAboutButton1 = testUtils1.getByText('Go to About');
                const navigationRef2 = createRef<any>();
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

            it('sends a RUM ViewEvent for each when switching screens { nested navigation containers }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
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

                // WHEN
                const goToNestedHome = testUtils.getByText('Go to Nested Home');
                fireEvent(goToNestedHome, 'press');

                // THEN
                expect(DdRum.startView).toHaveBeenCalledWith(
                    expect.any(String),
                    'NestedHome'
                );
            });
        });

        describe('stopTrackingViews', () => {
            it('does nothing when switching screens { navigationContainer listener detached }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
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
                const navigationRef1 = createRef<any>();
                const testUtils1: { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef1} />
                );
                const goToAboutButton1 = testUtils1.getByText('Go to About');
                const navigationRef2 = createRef<any>();
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

        describe.each([
            ['react-native 0.63-0.64', AppStateMockLegacy],
            ['react-native 0.65+', AppStateMock]
        ])(
            'AppState listener on %s',
            (reactNativeVersion, AppStateMockVersion) => {
                let appStateMock;
                beforeEach(() => {
                    appStateMock = new AppStateMockVersion();
                    mocked(AppState.addEventListener).mockImplementation(
                        // @ts-ignore
                        appStateMock.addEventListener
                    );
                    // @ts-ignore
                    if (appStateMock.removeEventListener) {
                        AppState.removeEventListener = jest.fn(
                            appStateMock.removeEventListener
                        );
                    }
                });
                it('registers and unregisters AppState', async () => {
                    // GIVEN
                    const navigationRef1 = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef1} />);
                    const navigationRef2 = createRef<any>();
                    render(<FakeNavigator2 navigationRef={navigationRef2} />);

                    // WHEN
                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef1.current
                    );
                    DdRumReactNavigationTracking.stopTrackingViews(
                        navigationRef1.current
                    );
                    expect(appStateMock.listeners.change).toHaveLength(0);

                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef2.current
                    );

                    // THEN
                    expect(AppState.addEventListener).toHaveBeenCalledTimes(2);
                    expect(appStateMock.listeners.change).toHaveLength(1);

                    // WHEN we go in background mode
                    appStateMock.changeValue('background');

                    // THEN the listener is only called once
                    expect(DdRum.stopView).toHaveBeenCalledTimes(1);
                });

                it('does not log AppState changes when tracking is stopped', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
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
                    const navigationRef = createRef<any>();
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
                    expect(
                        typeof navigationRef.current?.getCurrentRoute()?.key
                    ).toBe('string');
                });

                it('starts last view when app goes into foreground', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
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
                    const navigationRef = createRef<any>();
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
            }
        );

        describe('Android back handler', () => {
            it('does not send an error when the app closes with Android back button', async () => {
                // GIVEN
                const navigationRef1 = createRef<any>();
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
                const navigationRef2 = createRef<any>();
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
    }
);
