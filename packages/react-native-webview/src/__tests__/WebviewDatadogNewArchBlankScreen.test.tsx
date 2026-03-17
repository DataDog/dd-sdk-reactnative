/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Reproduction tests for RUMS-5458:
 * White Blank Screen Across All WebViews with RUM Errors
 *
 * The customer uses a bare React Native app with New Architecture (Fabric/TurboModules)
 * and the @datadog/mobile-react-native-webview wrapper. Despite having both the native
 * Datadog WebView wrapper and Browser SDK instrumented, WebViews render as blank screens
 * with error source labeled "WEBVIEW" in Session Replay.
 *
 * These tests verify the WebView wrapper behavior in scenarios matching the customer's
 * setup, particularly around message handling, allowedHosts propagation, and the
 * interaction between the Datadog bridge and user WebView content.
 */

import { render } from '@testing-library/react-native';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { NativeDdSdk } from '../ext-specs/NativeDdSdk';
import { WebView } from '../index';

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

jest.mock('../ext-specs/NativeDdSdk', () => {
    return {
        NativeDdSdk: {
            consumeWebviewEvent: jest.fn().mockResolvedValue(undefined),
            telemetryError: jest.fn().mockResolvedValue(undefined)
        }
    };
});

jest.mock('../ext-specs/NativeDdLogs', () => {
    return {
        __esModule: true,
        default: {
            error: jest.fn().mockResolvedValue(undefined)
        }
    };
});

describe('RUMS-5458: WebView blank screen with New Architecture', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Message handling should not interfere with WebView content', () => {
        it('should forward non-Datadog messages to user onMessage handler even when message is valid JSON', () => {
            /**
             * In the customer's setup, the Epic MyChart WebView sends its own
             * postMessage calls. These must be forwarded to the user's onMessage
             * handler and not swallowed by the Datadog message interceptor.
             */
            const userOnMessage = jest.fn();
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    onMessage={userOnMessage}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const datadogOnMessage = mockedWebView.mock.calls[0][0].onMessage;

            // Simulate a WebView postMessage with arbitrary JSON (not Datadog)
            const userJsonMessage = JSON.stringify({
                type: 'navigation',
                url: 'https://epicmychart.example.com/dashboard'
            });

            datadogOnMessage?.({
                nativeEvent: { data: userJsonMessage }
            } as any);

            expect(userOnMessage).toHaveBeenCalledTimes(1);
        });

        it('should not swallow messages when WebView sends empty or null data', () => {
            /**
             * Blank screen scenario: when WebView fails to load properly,
             * it may send null or empty messages. The handler should not throw.
             */
            const userOnMessage = jest.fn();
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    onMessage={userOnMessage}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const datadogOnMessage = mockedWebView.mock.calls[0][0].onMessage;

            // Null data should be handled gracefully
            expect(() => {
                datadogOnMessage?.({
                    nativeEvent: { data: null }
                } as any);
            }).not.toThrow();

            // Empty string should be forwarded to user handler
            datadogOnMessage?.({
                nativeEvent: { data: '' }
            } as any);

            // User handler should be called for non-null, non-Datadog messages
            expect(userOnMessage).toHaveBeenCalledTimes(1);
        });

        it('should correctly route Datadog NATIVE_EVENT messages to consumeWebviewEvent', () => {
            /**
             * When the Browser SDK in the WebView sends RUM events through the
             * bridge, they should reach consumeWebviewEvent on the native side.
             * If this fails, WebView tracking data is lost and Session Replay
             * shows the "WEBVIEW" error source.
             */
            const userOnMessage = jest.fn();
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    onMessage={userOnMessage}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const datadogOnMessage = mockedWebView.mock.calls[0][0].onMessage;

            const ddEvent = JSON.stringify({
                source: 'DATADOG',
                type: 'NATIVE_EVENT',
                message: '{"eventType":"view","session":{"id":"abc123"}}'
            });

            datadogOnMessage?.({
                nativeEvent: { data: ddEvent }
            } as any);

            expect(NativeDdSdk?.consumeWebviewEvent).toHaveBeenCalledWith(
                '{"eventType":"view","session":{"id":"abc123"}}'
            );
            expect(userOnMessage).not.toHaveBeenCalled();
        });
    });

    describe('allowedHosts propagation in New Architecture', () => {
        it('should include allowedHosts comment in injectedJavaScriptBeforeContentLoaded even without user JS code', () => {
            /**
             * In New Architecture, the native side extracts allowedHosts from
             * the injectedJavaScriptBeforeContentLoaded prop via a regex comment.
             * If allowedHosts is provided but no user JS code is given, the
             * comment MUST still be injected for native-side WebView tracking to
             * be configured.
             *
             * This is critical because without the comment, configureWebViewTracking
             * is never called on the native side under New Architecture, and the
             * WebView is tracked by the Datadog native component but without the
             * bridge being set up — potentially causing blank screens.
             */
            const allowedHosts = ['epicmychart.example.com', 'www.epic.com'];

            render(<WebView allowedHosts={allowedHosts} />);

            const mockedWebView = jest.mocked(RNWebView);
            const injectedJs =
                mockedWebView.mock.calls[0][0]
                    .injectedJavaScriptBeforeContentLoaded;

            // The injected JS must contain the allowedHosts comment for native extraction
            expect(injectedJs).toBeDefined();
            expect(injectedJs).not.toBeNull();
            expect(injectedJs).toContain('#allowedHosts=');
            expect(injectedJs).toContain('epicmychart.example.com');
            expect(injectedJs).toContain('www.epic.com');
        });

        it('should propagate allowedHosts through nativeConfig props for Old Architecture fallback', () => {
            /**
             * In Old Architecture, allowedHosts is passed as a native prop via
             * nativeConfig. Verify it's always set.
             */
            const allowedHosts = ['epicmychart.example.com'];

            render(<WebView allowedHosts={allowedHosts} />);

            const mockedWebView = jest.mocked(RNWebView);
            const nativeProps = mockedWebView.mock.calls[0][0].nativeConfig
                ?.props as any;

            expect(nativeProps?.allowedHosts).toEqual(allowedHosts);
        });

        it('should handle empty allowedHosts gracefully without causing blank screen', () => {
            /**
             * If the customer initially forgot to set allowedHosts (as described
             * in the ticket), the WebView should still render content — it just
             * won't have Datadog tracking. The Datadog wrapper must not interfere
             * with normal WebView rendering when allowedHosts is empty.
             */
            const allowedHosts: string[] = [];

            render(<WebView allowedHosts={allowedHosts} />);

            const mockedWebView = jest.mocked(RNWebView);

            // The WebView should still be rendered
            expect(mockedWebView).toHaveBeenCalled();

            // injectedJavaScriptBeforeContentLoaded should either be undefined
            // or contain valid (non-interfering) JS — not broken JS that causes
            // the WebView to fail
            const injectedJs =
                mockedWebView.mock.calls[0][0]
                    .injectedJavaScriptBeforeContentLoaded;

            if (injectedJs !== undefined && injectedJs !== null) {
                // If any JS is injected, it should not contain broken allowedHosts
                // that would cause the native side to misconfigure tracking
                expect(injectedJs).not.toContain('#allowedHosts=[]');
            }
        });

        it('should not inject broken allowedHosts comment when allowedHosts is undefined', () => {
            /**
             * When allowedHosts is not provided at all, no tracking comment
             * should be injected. The WebView should work as a plain WebView.
             */
            render(<WebView />);

            const mockedWebView = jest.mocked(RNWebView);
            const injectedJs =
                mockedWebView.mock.calls[0][0]
                    .injectedJavaScriptBeforeContentLoaded;

            // Should be undefined — no Datadog injection when no hosts configured
            expect(injectedJs).toBeUndefined();
        });
    });

    describe('WebView rendering with Datadog wrapper should not cause blank screen', () => {
        it('should not override user-provided injectedJavaScriptBeforeContentLoaded', () => {
            /**
             * The customer may have their own JS injected before content loads.
             * The Datadog wrapper must preserve it while adding its own tracking
             * comment. If the user's JS is overwritten, it could cause blank screens.
             */
            const userJs = "window.__APP_CONFIG__ = { theme: 'dark' };";
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    injectedJavaScriptBeforeContentLoaded={userJs}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const injectedJs =
                mockedWebView.mock.calls[0][0]
                    .injectedJavaScriptBeforeContentLoaded;

            // Must contain both the allowedHosts comment AND the user's JS code
            expect(injectedJs).toBeDefined();
            expect(injectedJs).toContain('#allowedHosts=');
            expect(injectedJs).toContain('__APP_CONFIG__');
        });

        it('should preserve user injectedJavaScript when Datadog wrapper is used', () => {
            /**
             * User-provided injectedJavaScript must still be passed through
             * to the underlying WebView.
             */
            const userJs = "document.body.style.backgroundColor = 'white';";
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    injectedJavaScript={userJs}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const injectedJs =
                mockedWebView.mock.calls[0][0].injectedJavaScript;

            expect(injectedJs).toBeDefined();
            expect(injectedJs).toContain('backgroundColor');
        });

        it('should pass all standard WebView props through to the underlying RNWebView', () => {
            /**
             * The Datadog wrapper must be transparent for standard WebView props.
             * If props like source, style, or scrollEnabled are dropped, the
             * WebView may not render content (blank screen).
             */
            const source = { uri: 'https://epicmychart.example.com' };
            const style = { flex: 1 };
            const allowedHosts = ['epicmychart.example.com'];

            render(
                <WebView
                    allowedHosts={allowedHosts}
                    source={source}
                    style={style}
                    scrollEnabled={true}
                    javaScriptEnabled={true}
                />
            );

            const mockedWebView = jest.mocked(RNWebView);
            const passedProps = mockedWebView.mock.calls[0][0];

            expect(passedProps.source).toEqual(source);
            expect(passedProps.style).toEqual(style);
            expect(passedProps.scrollEnabled).toBe(true);
            expect(passedProps.javaScriptEnabled).toBe(true);
        });
    });
});
