/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render } from '@testing-library/react-native';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { WebView } from '../index';
import { NativeDdWebView } from '../specs/NativeDdWebView';

jest.mock('react-native-webview', () => {
    return {
        WebView: jest.fn()
    };
});

jest.mock('../specs/NativeDdWebView', () => {
    return {
        NativeDdWebView: jest.fn()
    };
});

describe('WebView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('WebView is rendered with native component', () => {
        // Given
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(<WebView allowedHosts={allowedHosts} />);

        // Then
        const mockedWebView = jest.mocked(RNWebView);
        const component =
            mockedWebView.mock.calls[0][0].nativeConfig?.component;
        const mockedNativeWebView = jest.mocked(NativeDdWebView);

        expect(component).toBe(mockedNativeWebView);
    });

    it('Datadog WebView allowedHosts are forwarded to WebView nativeConfig props', () => {
        // Given
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(<WebView allowedHosts={allowedHosts} />);

        // Then
        const mockedWebView = jest.mocked(RNWebView);
        const props = mockedWebView.mock.calls[0][0].nativeConfig?.props as any;

        expect(props?.allowedHosts).toBe(allowedHosts);
    });
});
