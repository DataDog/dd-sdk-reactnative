import {fireEvent, render} from '@testing-library/react-native';
import {VegaSampleCrash} from '@example-vega/native-crash-module';
import React from 'react';

import {FeatureActionsScreen} from '../src/screens/FeatureActionsScreen';

describe('FeatureActionsScreen', () => {
  it('exposes JavaScript and app TurboModule crash tests', () => {
    const screen = render(
      <FeatureActionsScreen trackedViewKey="test-view" onBack={jest.fn()} />,
    );

    expect(screen.getByTestId('action-crash-javascript')).toBeTruthy();

    fireEvent.press(screen.getByTestId('action-crash-app-turbomodule'));

    expect(VegaSampleCrash.crashForTesting).toHaveBeenCalledTimes(1);
  });
});
