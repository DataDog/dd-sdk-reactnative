/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '@datadog/mobile-react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
    ApplicationMock,
    mockNativeComponents
} from 'react-native-navigation/Mock';
import type { ComponentDidAppearEvent } from 'react-native-navigation';
import { Navigation } from 'react-native-navigation';
import { AppState, Button } from 'react-native';
import React from 'react';

import type { ViewNamePredicate } from '../../../rum/instrumentation/DdRumReactNativeNavigationTracking';
import { DdRumReactNativeNavigationTracking } from '../../../rum/instrumentation/DdRumReactNativeNavigationTracking';

import { AppStateMockLegacy } from './__utils__/AppStateMockLegacy';
import { AppStateMock } from './__utils__/AppStateMock';

jest.mock('@datadog/mobile-react-native', () => {
    return {
        DdRum: {
            startView: jest.fn().mockImplementation(() => {}),
            stopView: jest.fn().mockImplementation(() => {})
        }
    };
});

// TODO: remove this when available in jest 29
function mocked<T extends (...args: any[]) => any>(item: T) {
    return (item as unknown) as jest.MockedFunction<typeof item>;
}

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

describe.each([
    ['react-native 0.63-0.64', AppStateMockLegacy],
    ['react-native 0.65+', AppStateMock]
])('AppState listener on %s', (reactNativeVersion, AppStateMockVersion) => {
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
        DdRumReactNativeNavigationTracking.startTracking();
        render(<ApplicationMock entryPoint={() => startPlayground()} />);
        await waitFor(() =>
            expect(DdRum.startView).toHaveBeenCalledWith(
                expect.any(String),
                'Home'
            )
        );

        // WHEN
        appStateMock.changeValue('background');

        // THEN
        expect(appStateMock.listeners.change).toHaveLength(1);
        expect(DdRum.stopView).toHaveBeenCalledTimes(1);
    });

    it('does not log AppState changes when tracking is stopped', async () => {
        // GIVEN
        DdRumReactNativeNavigationTracking.startTracking();
        DdRumReactNativeNavigationTracking.stopTracking();

        // WHEN
        appStateMock.changeValue('background');

        // THEN
        expect(DdRum.stopView).not.toHaveBeenCalled();
    });

    it('starts last view when app goes into foreground', async () => {
        // GIVEN
        DdRumReactNativeNavigationTracking.startTracking();
        const { findByText } = render(
            <ApplicationMock entryPoint={() => startPlayground()} />
        );
        const button = await findByText('Go to About');
        await fireEvent(button, 'press');
        await waitFor(() => expect(DdRum.startView).toHaveBeenCalledTimes(2));

        // WHEN
        appStateMock.changeValue('background');
        appStateMock.changeValue('active');

        // THEN
        expect(DdRum.stopView).toHaveBeenCalledTimes(1);
        expect(DdRum.startView).toHaveBeenCalledTimes(3);
        expect(DdRum.startView).toHaveBeenNthCalledWith(
            3,
            expect.any(String),
            'About'
        );
    });

    it('does not stop view when no navigator attached', async () => {
        // GIVEN
        DdRumReactNativeNavigationTracking.startTracking();

        // WHEN
        appStateMock.changeValue('background');

        // THEN
        expect(DdRum.stopView).not.toHaveBeenCalled();
    });
});
