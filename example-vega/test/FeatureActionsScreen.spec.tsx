import {render} from '@testing-library/react-native';
import React from 'react';

import {FeatureActionsScreen} from '../src/screens/FeatureActionsScreen';

describe('FeatureActionsScreen', () => {
  it('exposes JavaScript and native C++ crash tests', () => {
    const screen = render(
      <FeatureActionsScreen trackedViewKey="test-view" onBack={jest.fn()} />,
    );

    expect(screen.getByTestId('action-crash-javascript')).toBeTruthy();
    expect(screen.getByTestId('action-crash-native-cpp')).toBeTruthy();
  });
});
