/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render } from '@testing-library/react-native';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { WebView } from '../index';

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
        /**
         * GIVEN
         */
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];

        /**
         * WHEN
         */
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

        /**
         * THEN
         */
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
