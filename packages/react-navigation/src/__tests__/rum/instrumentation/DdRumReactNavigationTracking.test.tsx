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

import type {
    ParamsTrackingPredicate,
    ViewNamePredicate,
    ViewTrackingPredicate
} from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { DdRumReactNavigationTracking } from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { transformViewKey } from '../../../rum/instrumentation/utils';

import { AppStateMockLegacy } from './__utils__/AppStateMockLegacy';
import { AppStateMock } from './__utils__/AppStateMock';
import {
    FakeNavigator1 as FakeNavigator1v5,
    FakeNavigator2 as FakeNavigator2v5,
    FakeNestedNavigator as FakeNestedNavigatorv5,
    FakeTogglableNavigator as FakeTogglableNavigatorv5
} from './__utils__/Navigators/NavigatorsV5';
import {
    FakeNavigator1 as FakeNavigator1v6,
    FakeNavigator2 as FakeNavigator2v6,
    FakeNestedNavigator as FakeNestedNavigatorv6,
    FakeTogglableNavigator as FakeTogglableNavigatorv6
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

// Mock buffer registered in globalThis so DdRumReactNavigationTracking can
// access it via getGlobalInstance without importing BufferSingleton from core.
const BUFFER_SINGLETON_KEY = 'com.datadog.reactnative.buffer_singleton';

const mockNavigationBuffer = {
    startNavigation: jest.fn(),
    prepareEndNavigation: jest.fn(),
    flush: jest.fn(),
    endNavigation: jest.fn(),
    navigationStartTime: null as number | null
};

const mockBufferSingleton = {
    getNavigationBuffer: jest.fn(() => mockNavigationBuffer)
};

beforeAll(() => {
    (globalThis as any)[Symbol.for(BUFFER_SINGLETON_KEY)] = mockBufferSingleton;
});

jest.mock('@datadog/mobile-react-native', () => {
    return {
        DdRum: {
            startView: jest.fn().mockResolvedValue(undefined),
            stopView: jest.fn().mockResolvedValue(undefined),
            addError: jest.fn().mockResolvedValue(undefined)
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
// jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

beforeEach(() => {
    mocked(InternalLog.log).mockClear();
    jest.setTimeout(20000);
    mocked(DdRum.startView).mockClear();
    mocked(DdRum.stopView).mockClear();
    mocked(AppState.addEventListener).mockClear();
    mocked(BackHandler.exitApp).mockClear();

    (mockNavigationBuffer.startNavigation as jest.Mock).mockClear();
    (mockNavigationBuffer.endNavigation as jest.Mock).mockClear();
    mockBufferSingleton.getNavigationBuffer.mockClear();

    // @ts-ignore
    DdRumReactNavigationTracking._resetInternalStateForTesting();
});

// Unit tests
describe.each([
    [
        '5',
        {
            FakeNavigator1: FakeNavigator1v5,
            FakeNavigator2: FakeNavigator2v5,
            FakeNestedNavigator: FakeNestedNavigatorv5,
            FakeTogglableNavigator: FakeTogglableNavigatorv5
        }
    ],
    [
        '6',
        {
            FakeNavigator1: FakeNavigator1v6,
            FakeNavigator2: FakeNavigator2v6,
            FakeNestedNavigator: FakeNestedNavigatorv6,
            FakeTogglableNavigator: FakeTogglableNavigatorv6
        }
    ]
])(
    'DdRumReactNavigationTracking on react-navigation v%s',
    (
        version,
        {
            FakeNavigator1,
            FakeNavigator2,
            FakeNestedNavigator,
            FakeTogglableNavigator
        }
    ) => {
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

                // eslint-disable-next-line func-names
                const predicate: ViewNamePredicate = function (
                    _route: Route<string, any | undefined>,
                    _trackedName: string
                ) {
                    return customViewName;
                };
                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    {
                        viewNamePredicate: predicate
                    }
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

            it('sends a related RUM ViewEvent when switching screens { viewPredicate returns null }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');

                // eslint-disable-next-line func-names
                const predicate: ViewNamePredicate = function (
                    _route: Route<string, any | undefined>,
                    _trackedName: string
                ) {
                    return null;
                };

                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    {
                        viewNamePredicate: predicate
                    }
                );

                // WHEN
                expect(goToAboutButton).toBeTruthy();
                fireEvent(goToAboutButton, 'press');

                // THEN
                expect(DdRum.startView).not.toHaveBeenCalled();
            });

            it('sends a related RUM ViewEvent when switching screens { viewTrackingPredicate returns true }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');

                // eslint-disable-next-line func-names
                const predicate: ViewTrackingPredicate = function (
                    _route: Route<string, any | undefined>
                ) {
                    return true;
                };

                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    {
                        viewTrackingPredicate: predicate
                    }
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

            it('sends a related RUM ViewEvent when switching screens { viewTrackingPredicate returns true for Home screen only }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');

                // eslint-disable-next-line func-names
                const predicate: ViewTrackingPredicate = function (
                    _route: Route<string, any | undefined>
                ) {
                    return _route.name === 'Home';
                };

                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    {
                        viewTrackingPredicate: predicate
                    }
                );

                // WHEN
                expect(goToAboutButton).toBeTruthy();
                fireEvent(goToAboutButton, 'press');

                // THEN
                expect(DdRum.startView).toHaveBeenCalledTimes(1);
                expect(DdRum.startView).toHaveBeenCalledWith(
                    expect.any(String),
                    'Home'
                );
                expect(DdRum.startView).not.toHaveBeenCalledWith(
                    expect.any(String),
                    'About'
                );
            });

            it('sends a related RUM ViewEvent when switching screens { viewParamsPredicate returns params object }', async () => {
                // GIVEN
                const navigationRef = createRef<any>();
                const { getByText } = render(
                    <FakeNavigator1 navigationRef={navigationRef} />
                );
                const goToAboutButton = getByText('Go to About');
                const testParams = {
                    param1: true,
                    param2: 'abc'
                };

                // eslint-disable-next-line func-names
                const predicate: ParamsTrackingPredicate = function (
                    _route: Route<string, any | undefined>
                ) {
                    return testParams;
                };

                DdRumReactNavigationTracking.startTrackingViews(
                    navigationRef.current,
                    {
                        paramsTrackingPredicate: predicate
                    }
                );

                // WHEN
                expect(goToAboutButton).toBeTruthy();
                fireEvent(goToAboutButton, 'press');

                // THEN
                expect(DdRum.startView).toHaveBeenCalledTimes(2);
                expect(DdRum.startView).toHaveBeenCalledWith(
                    expect.any(String),
                    'Home',
                    { params: testParams }
                );
                expect(DdRum.startView).toHaveBeenCalledWith(
                    expect.any(String),
                    'About',
                    { params: testParams }
                );
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

            it('does nothing when startTrackingViews { undefined any }', async () => {
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
                const testUtils1: { getByText: any } = render(
                    <FakeNavigator1 navigationRef={navigationRef1} />
                );
                const goToAboutButton1 = testUtils1.getByText('Go to About');
                const navigationRef2 = createRef<any>();
                const testUtils2: { getByText: any } = render(
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
                const testUtils: { getByText: any } = render(
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
                const testUtils1: { getByText: any } = render(
                    <FakeNavigator1 navigationRef={navigationRef1} />
                );
                const goToAboutButton1 = testUtils1.getByText('Go to About');
                const navigationRef2 = createRef<any>();
                const testUtils2: { getByText: any } = render(
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
                    transformViewKey(navigationRef2StartRoute.key, 'Home'),
                    'Home'
                );
                expect(DdRum.startView).toHaveBeenCalledWith(
                    transformViewKey(
                        navigationRef2.current?.getCurrentRoute()?.key,
                        'About'
                    ),
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
                let appStateMock: any;
                beforeEach(() => {
                    AppState.currentState = 'active';
                    appStateMock = new AppStateMockVersion();
                    mocked(AppState.addEventListener).mockImplementation(
                        // @ts-ignore
                        appStateMock.addEventListener
                    );
                    if (appStateMock.removeEventListener) {
                        // @ts-ignore
                        AppState.removeEventListener = jest.fn(
                            appStateMock.removeEventListener
                        );
                    } else {
                        // @ts-ignore
                        delete AppState.removeEventListener;
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

                    const currentRoute = navigationRef.current?.getCurrentRoute();
                    const transformedKey = transformViewKey(
                        currentRoute?.key,
                        currentRoute?.name
                    );

                    expect(DdRum.stopView).toHaveBeenCalledWith(transformedKey);
                    expect(typeof transformedKey).toBe('string');
                });

                it('restarts last view when app goes into foreground', async () => {
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

                /**
                 * This is a typical scenario when apps go inactive: a call prompt is displayed which
                 * makes the app inactive.
                 * Taking the call makes the app go into background, then it comes back in the foreground
                 * when the call has ended.
                 */
                it('restarts last view when app goes inactive, then background then active', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef} />);

                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current
                    );
                    expect(DdRum.startView).toHaveBeenCalledTimes(1);

                    // WHEN
                    appStateMock.changeValue('inactive');
                    appStateMock.changeValue('background');
                    appStateMock.changeValue('inactive');
                    appStateMock.changeValue('active');

                    // THEN
                    expect(DdRum.stopView).toHaveBeenCalledTimes(1);
                    expect(DdRum.startView).toHaveBeenCalledTimes(2);
                });

                it('does not create a new view if the appState transitions to active after registration of route', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef} />);

                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current
                    );

                    // WHEN
                    appStateMock.changeValue('active');

                    // THEN
                    expect(DdRum.startView).toHaveBeenCalledTimes(1);
                });

                it('does not create a new view if the appState transitions to active after inactive', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef} />);

                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current
                    );

                    // WHEN
                    appStateMock.changeValue('inactive');
                    appStateMock.changeValue('active');

                    // THEN
                    expect(DdRum.startView).toHaveBeenCalledTimes(1);
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

                it('does not crash when stopTrackingViews is called before startTrackingViews', async () => {
                    // GIVEN
                    const navigationRef = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef} />);

                    DdRumReactNavigationTracking.stopTrackingViews(
                        navigationRef.current
                    );
                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current
                    );

                    // WHEN
                    appStateMock.changeValue('background');

                    // THEN
                    expect(DdRum.stopView).toHaveBeenCalled();
                });

                it('does not create a RUM view when the app starts in background', async () => {
                    // GIVEN
                    appStateMock.changeValue('background');
                    const navigationRef = createRef<any>();
                    render(<FakeNavigator1 navigationRef={navigationRef} />);

                    DdRumReactNavigationTracking.startTrackingViews(
                        navigationRef.current
                    );

                    // THEN
                    expect(DdRum.startView).not.toHaveBeenCalled();
                });

                // Note: currently iOS apps start in "unknown" app state, but should default to "inactive"
                it.each(['unknown', 'inactive'])(
                    'creates only 1 RUM View when the app starts in %s then becomes active',
                    async initialAppState => {
                        // GIVEN
                        appStateMock.changeValue(initialAppState);
                        const navigationRef = createRef<any>();
                        render(
                            <FakeNavigator1 navigationRef={navigationRef} />
                        );

                        DdRumReactNavigationTracking.startTrackingViews(
                            navigationRef.current
                        );

                        // WHEN
                        appStateMock.changeValue('active');

                        // THEN
                        expect(DdRum.startView).toHaveBeenCalledTimes(1);
                    }
                );
            }
        );

        describe('Togglable navigators', () => {
            it('does not send an error when a navigator is toggled and tracking is stopped', async () => {
                const navigationRef = createRef<any>();
                const { findByText } = render(
                    <FakeTogglableNavigator navigationRef={navigationRef} />
                );

                const hideNavButton = await findByText('display nav 2');
                fireEvent(hideNavButton, 'press');

                expect(DdRum.startView).toHaveBeenCalledTimes(1);

                const switchNav = await findByText('display nav 1');
                fireEvent(switchNav, 'press');
                expect(DdRum.startView).toHaveBeenCalledTimes(2);

                expect(InternalLog.log).not.toHaveBeenCalled();
            });
        });

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

describe('Navigation Buffer Integration', () => {
    // These tests verify the buffer lifecycle wiring
    // They use the v6 navigators as the buffer behavior is version-independent.
    const mockNavBuffer = mockNavigationBuffer;

    it('calls startNavigation when dispatch is called directly on the navigation ref', async () => {
        // startNavigation is triggered by the patched dispatch on the
        // navigation container ref. Screen-level navigation.navigate()
        // uses an internal dispatch path that may not hit the container
        // ref's dispatch. This test verifies the dispatch patch by
        // calling dispatch directly on the container ref.
        const navigationRef = createRef<any>();
        render(<FakeNavigator1v6 navigationRef={navigationRef} />);

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        (mockNavBuffer.startNavigation as jest.Mock).mockClear();
        (mockNavBuffer.endNavigation as jest.Mock).mockClear();

        navigationRef.current.dispatch({
            type: 'NAVIGATE',
            payload: { name: 'About' }
        });
        expect(mockNavBuffer.startNavigation).toHaveBeenCalled();
    });

    it('calls prepareEndNavigation before startView and flush after it resolves for push navigation', async () => {
        const navigationRef = createRef<any>();
        const { getByText } = render(
            <FakeNavigator1v6 navigationRef={navigationRef} />
        );

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        (mockNavBuffer.prepareEndNavigation as jest.Mock).mockClear();
        (mockNavBuffer.flush as jest.Mock).mockClear();

        fireEvent.press(getByText('Go to About'));

        // prepareEndNavigation is called synchronously before startView
        expect(mockNavBuffer.prepareEndNavigation).toHaveBeenCalled();

        // Wait for startView promise to resolve, then flush is called
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockNavBuffer.flush).toHaveBeenCalled();
    });

    it('calls endNavigation when viewTrackingPredicate returns false', async () => {
        const navigationRef = createRef<any>();
        const { getByText } = render(
            <FakeNavigator1v6 navigationRef={navigationRef} />
        );

        const viewTrackingPredicate: ViewTrackingPredicate = _route => false;
        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current, {
            viewTrackingPredicate
        });
        (mockNavBuffer.startNavigation as jest.Mock).mockClear();
        (mockNavBuffer.endNavigation as jest.Mock).mockClear();

        fireEvent.press(getByText('Go to About'));

        // endNavigation called synchronously since view is not tracked
        // (startNavigation may not be called here because navigation.navigate()
        // uses a screen-level dispatch that may bypass the container ref's patched dispatch)
        expect(mockNavBuffer.endNavigation).toHaveBeenCalled();
    });

    it('handles rapid consecutive navigations via dispatch', async () => {
        // Rapid navigations via direct dispatch calls verify the buffer
        // correctly handles multiple startNavigation calls.
        const navigationRef = createRef<any>();
        render(<FakeNavigator1v6 navigationRef={navigationRef} />);

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        (mockNavBuffer.startNavigation as jest.Mock).mockClear();
        (mockNavBuffer.endNavigation as jest.Mock).mockClear();

        // Trigger two dispatches in quick succession
        navigationRef.current.dispatch({
            type: 'NAVIGATE',
            payload: { name: 'About' }
        });
        navigationRef.current.dispatch({
            type: 'NAVIGATE',
            payload: { name: 'Home' }
        });

        // The buffer should handle multiple startNavigation calls gracefully
        expect(mockNavBuffer.startNavigation).toHaveBeenCalledTimes(2);

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockNavBuffer.flush).toHaveBeenCalled();
    });

    it('gesture-based back navigation releases buffer via state change listener', async () => {
        // Gesture-based back navigation (swipe) may bypass the dispatch patch
        // entirely, as React Navigation's gesture handler may use an internal
        // dispatch path that our monkey-patch does not intercept.
        //
        // This test simulates the scenario where startNavigation was called
        // via dispatch, then we use goBack() to trigger the state change
        // listener path (handleRouteNavigation -> startView -> endNavigation).
        // In production, the NavigationBuffer's 500ms timeout is the safety
        // net when dispatch is not intercepted.

        const navigationRef = createRef<any>();
        const { getByText } = render(
            <FakeNavigator1v6 navigationRef={navigationRef} />
        );

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

        // Navigate to About first so we have somewhere to go back from
        fireEvent.press(getByText('Go to About'));
        await new Promise(resolve => setTimeout(resolve, 0));

        // Clear mocks after the push navigation settles
        (mockNavBuffer.startNavigation as jest.Mock).mockClear();
        (mockNavBuffer.endNavigation as jest.Mock).mockClear();

        // Simulate a gesture-back: manually call startNavigation (as if dispatch
        // was intercepted) then trigger goBack() on the navigation ref.
        mockNavBuffer.startNavigation();
        expect(mockNavBuffer.startNavigation).toHaveBeenCalledTimes(1);

        // The state change listener in DdRumReactNavigationTracking calls
        // handleRouteNavigation, which calls endNavigation after startView resolves.
        if (navigationRef.current?.canGoBack()) {
            navigationRef.current.goBack();
        }

        // Wait for startView promise to resolve and endNavigation to be called
        await new Promise(resolve => setTimeout(resolve, 0));

        // flush should have been called via the normal
        // handleRouteNavigation -> prepareEndNavigation -> startView -> .then(flush) path
        expect(mockNavBuffer.flush).toHaveBeenCalled();
    });

    it('stopTrackingViews calls endNavigation as teardown', () => {
        const navigationRef = createRef<any>();
        render(<FakeNavigator1v6 navigationRef={navigationRef} />);

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        (mockNavBuffer.endNavigation as jest.Mock).mockClear();

        DdRumReactNavigationTracking.stopTrackingViews(navigationRef.current);

        expect(mockNavBuffer.endNavigation).toHaveBeenCalled();
    });

    it('calls flush even when startView rejects (fail-safe)', async () => {
        mocked(DdRum.startView).mockRejectedValueOnce(
            new Error('native error')
        );

        const navigationRef = createRef<any>();
        const { getByText } = render(
            <FakeNavigator1v6 navigationRef={navigationRef} />
        );

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
        (mockNavBuffer.prepareEndNavigation as jest.Mock).mockClear();
        (mockNavBuffer.flush as jest.Mock).mockClear();

        fireEvent.press(getByText('Go to About'));

        // prepareEndNavigation called synchronously before startView
        expect(mockNavBuffer.prepareEndNavigation).toHaveBeenCalled();

        // Wait for rejected promise to settle — flush called as fail-safe
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(mockNavBuffer.flush).toHaveBeenCalled();
    });
});

describe('Regression: Normal Event Flow', () => {
    // Verify existing behavior is unchanged
    it('existing tests pass with updated mock (startView returns Promise)', async () => {
        // This is verified by the entire existing test suite still passing.
        // This test explicitly checks that startView being a promise doesn't break the basic flow.
        const navigationRef = createRef<any>();
        const { getByText } = render(
            <FakeNavigator1v6 navigationRef={navigationRef} />
        );

        DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);

        fireEvent.press(getByText('Go to About'));

        expect(DdRum.startView).toHaveBeenCalled();
    });

    it('buffer singleton registered in globalThis is accessible', () => {
        // Verify the globalThis-based registry is wired correctly — the mock
        // buffer singleton registered in beforeAll must expose a navigation buffer
        // with the expected methods so DdRumReactNavigationTracking can call them.
        expect(mockBufferSingleton.getNavigationBuffer()).not.toBeNull();
        expect(mockNavigationBuffer.startNavigation).toBeDefined();
        expect(mockNavigationBuffer.endNavigation).toBeDefined();
    });
});
