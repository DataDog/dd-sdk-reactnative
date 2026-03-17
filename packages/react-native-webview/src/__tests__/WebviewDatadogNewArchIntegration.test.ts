/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Integration tests for RUMS-5458:
 * Verifies the interaction between JS-side allowedHosts encoding and the
 * native-side extraction logic used in New Architecture.
 *
 * In the New Architecture, the native ViewManager cannot receive custom props
 * directly from React. Instead, allowedHosts is encoded as a comment in
 * injectedJavaScriptBeforeContentLoaded and extracted on the native side
 * via regex. If this encoding/extraction chain breaks, WebView tracking is
 * not configured, leading to blank screens and "WEBVIEW" error sources.
 */

import { wrapJsCodeWithAllowedHosts } from '../utils/webview-js-utils';

/**
 * Simulates the native-side regex extraction of allowedHosts from
 * injectedJavaScriptBeforeContentLoaded. This mirrors the Kotlin code in
 * DdSdkReactNativeWebViewManager.extractAllowedHosts (newarch variant).
 */
function extractAllowedHostsFromInjectedJs(
    input: string | undefined
): string[] | null {
    if (!input) {
        return null;
    }

    // Matches the Kotlin regex: """//\s*#allowedHosts\s*=\s*(.+)"""
    const regex = /\/\/\s*#allowedHosts\s*=\s*(.+)/;
    const match = input.match(regex);
    if (!match) {
        return null;
    }

    const jsonString = match[1].trim();
    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

describe('RUMS-5458: New Architecture allowedHosts encoding/extraction chain', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('allowedHosts round-trip: JS encoding -> native extraction', () => {
        it('should encode and extract single host correctly', () => {
            const allowedHosts = ['epicmychart.example.com'];
            const injectedJs = wrapJsCodeWithAllowedHosts(
                undefined,
                allowedHosts
            );

            const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
            expect(extracted).toEqual(allowedHosts);
        });

        it('should encode and extract multiple hosts correctly', () => {
            const allowedHosts = [
                'epicmychart.example.com',
                'www.epic.com',
                'portal.optum.com'
            ];
            const injectedJs = wrapJsCodeWithAllowedHosts(
                undefined,
                allowedHosts
            );

            const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
            expect(extracted).toEqual(allowedHosts);
        });

        it('should encode and extract hosts with user JS code present', () => {
            const allowedHosts = ['epicmychart.example.com'];
            const userJs = 'window.__init__ = true;';
            const injectedJs = wrapJsCodeWithAllowedHosts(userJs, allowedHosts);

            const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
            expect(extracted).toEqual(allowedHosts);

            // User JS should also be present
            expect(injectedJs).toContain('__init__');
        });

        it('should handle hosts with special characters in URLs', () => {
            const allowedHosts = [
                'my-app.example.com',
                'app.sub.domain.co.uk',
                'localhost:3000'
            ];
            const injectedJs = wrapJsCodeWithAllowedHosts(
                undefined,
                allowedHosts
            );

            const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
            expect(extracted).toEqual(allowedHosts);
        });
    });

    describe('Edge cases that may cause blank screens', () => {
        it('should return null extraction when allowedHosts is empty array', () => {
            /**
             * BUG REPRODUCTION: When allowedHosts is an empty array [],
             * the JS side encodes it as `// #allowedHosts=[]`, but the native
             * side should NOT call configureWebViewTracking with an empty list,
             * as this could interfere with WebView rendering.
             *
             * Expected: empty array should NOT produce an allowedHosts comment,
             * because tracking with 0 hosts is meaningless and the native
             * component override (DdReactNativeWebView) may still interfere
             * with normal rendering.
             */
            const allowedHosts: string[] = [];
            const injectedJs = wrapJsCodeWithAllowedHosts(
                undefined,
                allowedHosts
            );

            if (injectedJs !== undefined) {
                const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
                // If extraction succeeds, it should NOT return an empty array
                // because enabling WebView tracking with empty hosts is wrong
                expect(extracted).toBeNull();
            }
        });

        it('should not produce allowedHosts comment when allowedHosts is undefined', () => {
            /**
             * When allowedHosts is undefined, no tracking comment should exist.
             * The native side should see no comment and skip tracking setup.
             */
            const injectedJs = wrapJsCodeWithAllowedHosts(undefined, undefined);

            expect(injectedJs).toBeUndefined();

            const extracted = extractAllowedHostsFromInjectedJs(injectedJs);
            expect(extracted).toBeNull();
        });

        it('should produce valid JS code that does not break WebView rendering', () => {
            /**
             * The injected JS must be syntactically valid. If it contains syntax
             * errors, the WebView's JavaScript context will fail, potentially
             * causing a blank screen.
             */
            const allowedHosts = ['epicmychart.example.com'];
            const userJs = "document.addEventListener('load', function() {});";
            const injectedJs = wrapJsCodeWithAllowedHosts(userJs, allowedHosts);

            expect(injectedJs).toBeDefined();

            // Verify the JS is syntactically valid by attempting to parse it
            // eslint-disable-next-line no-eval
            expect(() => eval(`(function() { ${injectedJs} })`)).not.toThrow();
        });

        it('should produce valid JS even with complex user code', () => {
            /**
             * Complex user-injected JS should be safely wrapped without
             * breaking the overall JS syntax.
             */
            const allowedHosts = ['epicmychart.example.com'];
            const complexUserJs = `
                (function() {
                    var config = { api: "https://api.example.com" };
                    window.postMessage(JSON.stringify(config), "*");
                })();
            `;
            const injectedJs = wrapJsCodeWithAllowedHosts(
                complexUserJs,
                allowedHosts
            );

            expect(injectedJs).toBeDefined();
            // eslint-disable-next-line no-eval
            expect(() => eval(`(function() { ${injectedJs} })`)).not.toThrow();
        });
    });

    describe('DatadogEventBridge injection behavior', () => {
        it('should not inject DatadogEventBridge setup code in injectedJavaScriptBeforeContentLoaded', () => {
            /**
             * BUG INVESTIGATION: The RFC for WebView tracking on React Native
             * states that the JS-side should inject a DatadogEventBridge object
             * before the WebView loads. However, in the current implementation,
             * this bridge is set up on the native side via WebViewTracking.enable().
             *
             * If the native side fails to call WebViewTracking.enable() (e.g.,
             * because allowedHosts extraction failed), the Browser SDK in the
             * WebView will not find the bridge and may behave unexpectedly.
             *
             * Expected: The injected JS should NOT contain DatadogEventBridge
             * setup -- that's the native side's job. But we verify the comment
             * is present so the native side can do its job.
             */
            const allowedHosts = ['epicmychart.example.com'];
            const injectedJs = wrapJsCodeWithAllowedHosts(
                undefined,
                allowedHosts
            );

            expect(injectedJs).toBeDefined();
            // The JS-side should NOT inject DatadogEventBridge
            // (that's done natively by WebViewTracking.enable)
            expect(injectedJs).not.toContain('DatadogEventBridge');

            // But it MUST contain the allowedHosts for native extraction
            expect(injectedJs).toContain('#allowedHosts=');
        });
    });
});
