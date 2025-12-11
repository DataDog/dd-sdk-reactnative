/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    wrapJsCodeInTryAndCatch,
    wrapJsCodeWithAllowedHosts
} from '../utils/webview-js-utils';

import { dedent } from './__utils__/string-utils';

describe('WebView JS Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('M wrapJsCodeWithAllowedHosts wraps JS code in try & catch with DD messaging W jsCode is not null', () => {
        it('M returns the allowedHosts JS comment W { jsCode = undefined & valid allowedHosts }', () => {
            // Given
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const jsCode = undefined;

            // When
            const wrappedCode = wrapJsCodeWithAllowedHosts(jsCode, [
                'example.com',
                'test.com'
            ]);

            // Then
            const expected = '// #allowedHosts=["example.com","test.com"]\n';
            expect(wrappedCode).toBeDefined();
            expect(dedent(wrappedCode as string)).toBe(expected);
            expect(warnSpy).not.toHaveBeenCalled();

            warnSpy.mockRestore();
        });

        it('M returns the JS code wrapped in try and catch with allowedHosts comment W { custom JS code & valid allowedHosts }', () => {
            // Given
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const jsCode = "console.log('test')";

            // When
            const wrappedCode = wrapJsCodeWithAllowedHosts(jsCode, [
                'example.com',
                'test.com'
            ]);

            // Then
            const expected = dedent(`// #allowedHosts=["example.com","test.com"]

try{
  console.log('test')
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
            expect(wrappedCode).toBeDefined();
            expect(dedent(wrappedCode as string)).toBe(expected);
            expect(warnSpy).not.toHaveBeenCalled();

            warnSpy.mockRestore();
        });

        it('M returns the JS code wrapped in try and catch W { custom JS code & allowedHosts = undefined }', () => {
            // Given
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const jsCode = "console.log('test')";

            // When
            const wrappedCode = wrapJsCodeWithAllowedHosts(jsCode, undefined);

            // Then
            const expected = dedent(`
            try{
              console.log('test')
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
            expect(wrappedCode).toBeDefined();
            expect(dedent(wrappedCode as string)).toBe(expected);
            expect(warnSpy).toHaveBeenCalledWith(
                "[@datadog/mobile-react-native-webview] Invalid 'allowedHosts' format: Error: allowedHosts is undefined"
            );

            warnSpy.mockRestore();
        });

        it('M returns the JS code wrapped in try and catch W { custom JS code & invalid JSON allowedHosts }', () => {
            // Given
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const jsCode = "console.log('test')";

            // When
            const wrappedCode = wrapJsCodeWithAllowedHosts(
                jsCode,
                (() => 'incompatible') as any
            );

            // Then
            const expected = dedent(`
            try{
              console.log('test')
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
            expect(wrappedCode).toBeDefined();
            expect(dedent(wrappedCode as string)).toBe(expected);
            expect(warnSpy).toHaveBeenCalledWith(
                "[@datadog/mobile-react-native-webview] Invalid 'allowedHosts' format: Error: JSON.stringify returned 'undefined' for the given hosts"
            );

            warnSpy.mockRestore();
        });

        it('M returns undefined W { jsCode = undefined & allowedHosts = undefined }', () => {
            // Given
            const jsCode = undefined;
            const allowedHosts = undefined;
            // When
            const wrappedCode = wrapJsCodeWithAllowedHosts(
                jsCode,
                allowedHosts
            );
            // Then
            expect(wrappedCode).toBe(undefined);
        });
    });

    describe('M wrapJsCodeInTryAndCatch wraps the given JS code in a try & catch block with DD messaging', () => {
        it('M returns the JS code wrapped in try and catch W { custom JS code is defined }', () => {
            // Given
            const jsCode = "console.log('test')";

            // When
            const wrappedCode = wrapJsCodeInTryAndCatch(jsCode);

            // Then
            const expected = dedent(`try{
  console.log('test')
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
            expect(wrappedCode).toBeDefined();
            expect(dedent(wrappedCode as string)).toBe(expected);
        });

        it('M returns undefined W { custom JS code is undefined }', () => {
            // Given
            const jsCode = undefined;

            // When
            const wrappedCode = wrapJsCodeInTryAndCatch(jsCode);

            // Then
            expect(wrappedCode).toBeUndefined();
        });
    });
});
