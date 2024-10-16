/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { render } from '@testing-library/react-native';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { WebView } from '../index';

import { dedent } from './__utils__/string-utils';

jest.mock('react-native-webview', () => {
    return {
        WebView: jest.fn(props => {
            // eslint-disable-next-line no-eval
            eval(props.injectedJavaScriptBeforeContentLoaded);
            // eslint-disable-next-line no-eval
            eval(props.injectedJavaScript);
            return undefined;
        })
    };
});

const callfunction = jest.fn();
const postMessageMock = jest.fn();

window['ReactNativeWebView'] = {
    postMessage: postMessageMock
};

describe('Webview', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should pass injectedJavaScriptBeforeContentLoaded prop to WebView component', () => {
        // Given
        const injectedJavaScriptBeforeContentLoaded = 'callfunction()';
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(
            <WebView
                allowedHosts={allowedHosts}
                injectedJavaScriptBeforeContentLoaded={
                    injectedJavaScriptBeforeContentLoaded
                }
            />
        );

        // Then
        expect(callfunction).toHaveBeenCalled();
    });

    it('should pass injectedJavaScript prop to WebView component', () => {
        // Given
        const injectedJavaScript = 'callfunction()';
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(
            <WebView
                allowedHosts={allowedHosts}
                injectedJavaScript={injectedJavaScript}
            />
        );

        // Then
        expect(callfunction).toHaveBeenCalled();
    });

    it('should pass injectedJavaScriptBeforeContentLoaded prop to WebView component W { injectedJavaScriptBeforeContentLoadedForMainFrameOnly = true }', () => {
        // Given
        const injectedJavaScript = 'callfunction()';
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(
            <WebView
                allowedHosts={allowedHosts}
                injectedJavaScriptBeforeContentLoadedForMainFrameOnly={true}
                injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            />
        );

        // Then
        expect(callfunction).toHaveBeenCalled();
    });

    it('should pass injectedJavaScript prop to WebView component W { injectedJavaScriptForMainFrameOnly = true }', () => {
        // Given
        const injectedJavaScript = 'callfunction()';
        const allowedHosts = ['example.com', 'localhost'];

        // When
        render(
            <WebView
                allowedHosts={allowedHosts}
                injectedJavaScriptForMainFrameOnly={true}
                injectedJavaScript={injectedJavaScript}
            />
        );

        // Then
        expect(callfunction).toHaveBeenCalled();
    });

    it('should wrap injectedJavaScript in try & catch block', () => {
        // Given
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];
        const injectedJavaScript = 'testInjectedJavaScript()';

        // When
        render(
            <WebView
                onMessage={onMessage}
                allowedHosts={allowedHosts}
                injectedJavaScript={injectedJavaScript}
            />
        );

        // Then
        const mockedWebView = jest.mocked(RNWebView);
        const realInjectedJs = dedent(
            mockedWebView.mock.calls[0][0].injectedJavaScript ?? ''
        );
        const expected = dedent(`
            try{
              testInjectedJavaScript()
            }
            catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                source: 'DATADOG',
                type: 'ERROR',
                message: errorMsg
              }));
              true;
            }`);

        expect(realInjectedJs).toBe(expected);
    });

    it('should wrap injectedJavaScriptBeforeContentLoaded in try & catch block', () => {
        // Given
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];
        const injectedJavaScript = 'testInjectedJavaScript()';

        // When
        render(
            <WebView
                onMessage={onMessage}
                allowedHosts={allowedHosts}
                injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            />
        );

        // Then
        const mockedWebView = jest.mocked(RNWebView);
        const realInjectedJs = dedent(
            mockedWebView.mock.calls[0][0]
                .injectedJavaScriptBeforeContentLoaded ?? ''
        );
        const expected = dedent(`
            try{
              testInjectedJavaScript()
            }
            catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                source: 'DATADOG',
                type: 'ERROR',
                message: errorMsg
              }));
              true;
            }`);

        expect(realInjectedJs).toBe(expected);
    });

    it('should call postMessage with datadog error event W injectedJavaScript has errors', () => {
        // Given
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];
        const injectedJavaScript = 'testInjectedJavaScript()';

        // When
        render(
            <WebView
                onMessage={onMessage}
                allowedHosts={allowedHosts}
                injectedJavaScript={injectedJavaScript}
            />
        );

        // Then
        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({
                source: 'DATADOG',
                type: 'ERROR',
                message: 'testInjectedJavaScript is not defined'
            })
        );
    });

    it('should call postMessage with datadog error event W injectedJavaScriptBeforeContentLoaded has errors', () => {
        // Given
        const onMessage = jest.fn();
        const allowedHosts = ['localhost', 'example.com'];
        const injectedJavaScript = 'testInjectedJavaScript()';

        // When
        render(
            <WebView
                onMessage={onMessage}
                allowedHosts={allowedHosts}
                injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            />
        );

        // Then
        expect(postMessageMock).toHaveBeenCalledWith(
            JSON.stringify({
                source: 'DATADOG',
                type: 'ERROR',
                message: 'testInjectedJavaScript is not defined'
            })
        );
    });
});
