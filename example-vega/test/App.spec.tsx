import 'react-native';
import {fireEvent, render} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';

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
});
