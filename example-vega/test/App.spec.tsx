import 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
import * as React from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';

import {App} from '../src/App';
import {colors} from '../src/theme';

describe('Template App Snapshot tests', () => {
  it('Initial App screen', () => {
    const screen = render(<App />);
    expect(screen).toMatchSnapshot();
  });

  it('App screen after navigating to Network', () => {
    const screen = render(<App />);
    const button = screen.getByTestId('networkLink');
    fireEvent.press(button);
    expect(screen).toMatchSnapshot();
  });

  it('navigates to Feature Scenarios', () => {
    const screen = render(<App />);
    const button = screen.getByTestId('featureScenariosLink');
    fireEvent.press(button);
    expect(screen.getByText('Feature Scenarios')).toBeTruthy();
    expect(screen.getByTestId('runAllScenarios')).toBeTruthy();
  });

  it('navigates to Feature Actions', () => {
    const screen = render(<App />);
    const button = screen.getByTestId('featureActionsLink');
    fireEvent.press(button);
    expect(screen.getByText('Feature Actions')).toBeTruthy();
    expect(screen.getByTestId('action-add-global-attribute')).toBeTruthy();
  });

  it('keeps focused menu text readable', () => {
    const screen = render(<App />);
    const button = screen.getByTestId('featureActionsLink');
    const touchable = screen
      .UNSAFE_getAllByType(TouchableOpacity)
      .find((element) => element.props.testID === 'featureActionsLink');

    fireEvent(button, 'focus');

    expect(touchable?.props.activeOpacity).toBe(1);
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({
      backgroundColor: colors.focusSurface,
    });
    expect(
      StyleSheet.flatten(screen.getByText('Feature Actions').props.style),
    ).toMatchObject({color: colors.focusText});
  });
});
