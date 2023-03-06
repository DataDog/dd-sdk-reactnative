import { render } from '@testing-library/react-native';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { WebView } from '../WebViewDatadog';

jest.mock('react-native-webview', () => {
    return {
        WebView: jest.fn()
    };
});

describe('WebView performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('should update the onMessage prop of the RNWebView component', () => {
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];
        const { rerender } = render(
            <WebView onMessage={onMessage} allowedHosts={allowedHosts} />
        );

        // Render the component with a new onMessage prop
        rerender(<WebView onMessage={onMessage} allowedHosts={allowedHosts} />);

        // Render the component with a new onMessage prop
        const newOnMessage = jest.fn();
        rerender(
            <WebView onMessage={newOnMessage} allowedHosts={allowedHosts} />
        );
        const mockedWebView = jest.mocked(RNWebView);
        // Verify that the onMessage prop of the RNWebView component has changed
        expect(mockedWebView.mock.calls[0][0].onMessage).toBe(
            mockedWebView.mock.calls[1][0].onMessage
        );
        expect(mockedWebView.mock.calls[0][0].onMessage).not.toBe(
            mockedWebView.mock.calls[2][0].onMessage
        );
    });
});
