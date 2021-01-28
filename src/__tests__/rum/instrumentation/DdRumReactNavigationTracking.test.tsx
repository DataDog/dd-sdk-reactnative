import React from 'react';
import { View, Text, Button } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { DdRum } from '../../../index';
import DdRumReactNavigationTracking from '../../../rum/instrumentation/DdRumReactNavigationTracking';
import { render, fireEvent } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';

jest.mock('../../../index', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            startView: jest.fn().mockImplementation(() => { })
        },
    };
});

const { Screen, Navigator } = createStackNavigator();
const navigationRef1: React.RefObject<NavigationContainerRef> = React.createRef();
const navigationRef2: React.RefObject<NavigationContainerRef> = React.createRef();

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper');
jest.useFakeTimers();


beforeEach(() => {
    jest.setTimeout(20000);
    DdRum.startView.mockReset();
})

// Unit tests

it('M send a RUM ViewEvent W startTrackingViews', async () => {

    // GIVEN
    render(<FakeNavigator1 />);

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
    expect(DdRum.startView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
})

it('M send a related RUM ViewEvent W switching screens { navigationContainer listener attached }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})

it('M only register once W startTrackingViews{ mutliple times }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})

it('M do nothing W switching screens { navigationContainer listener detached }', async () => {

    // GIVEN
    const { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton = getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);

    // WHEN
    DdRumReactNavigationTracking.stopTrackingViews(navigationRef1.current);
    expect(goToAboutButton).toBeTruthy();
    fireEvent(goToAboutButton, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(1);
})

it('M do nothing W startTrackingViews { undefined NavigationContainerRef ', async () => {

    // WHEN
    DdRumReactNavigationTracking.startTrackingViews(null);

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(0);
})

it('M send a RUM ViewEvent for each W startTrackingViews { mutliple navigation containers }', async () => {

    // GIVEN
    const testUtils1: { getByText } = render(<FakeNavigator1 />);
    const goToAboutButton1 = testUtils1.getByText('Go to About');
    const testUtils2: { getByText } = render(<FakeNavigator2 />);
    const goToAboutButton2 = testUtils2.getByText('Go to About');
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // WHEN
    expect(goToAboutButton1).toBeTruthy();
    expect(goToAboutButton2).toBeTruthy();
    fireEvent(goToAboutButton1, "press");
    fireEvent(goToAboutButton2, "press");

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(4);
    expect(DdRum.startView.mock.calls[2][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[2][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[2][3]).toStrictEqual({});
    expect(DdRum.startView.mock.calls[3][0]).toBe(navigationRef2.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[3][1]).toBe(navigationRef2.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[3][3]).toStrictEqual({});
})

it('M send a RUM ViewEvent for each W switching screens { mutliple navigation containers }', async () => {

    // GIVEN
    render(<FakeNavigator1 />);
    render(<FakeNavigator2 />);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef1.current);
    DdRumReactNavigationTracking.startTrackingViews(navigationRef2.current);

    // WHEN

    // THEN
    expect(DdRum.startView.mock.calls.length).toBe(2);
    expect(DdRum.startView.mock.calls[0][0]).toBe(navigationRef1.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[0][1]).toBe(navigationRef1.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[0][3]).toStrictEqual({});
    expect(DdRum.startView.mock.calls[1][0]).toBe(navigationRef2.current?.getCurrentRoute()?.key);
    expect(DdRum.startView.mock.calls[1][1]).toBe(navigationRef2.current?.getCurrentRoute()?.name);
    expect(DdRum.startView.mock.calls[1][3]).toStrictEqual({});
})


// Internals

function FakeAboutScreen({ navigation }) {

    return (
        <View>
            <Text>Welcome to About</Text>
        </View>

    )
}

function FakeHomeScreen({ navigation }) {

    return (
        <View>
            <Text>Welcome to Home</Text>
            <Button title="Go to About" onPress={() => {
                navigation.navigate("About");
            }}></Button>
        </View>

    )
}

function FakeNavigator1() {
    return (
        <NavigationContainer ref={navigationRef1}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    )
}

function FakeNavigator2() {
    return (
        <NavigationContainer ref={navigationRef2}>
            <Navigator>
                <Screen name="Home" component={FakeHomeScreen} />
                <Screen name="About" component={FakeAboutScreen} />
            </Navigator>
        </NavigationContainer>
    )
}


