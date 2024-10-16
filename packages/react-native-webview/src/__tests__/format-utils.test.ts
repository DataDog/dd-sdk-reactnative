/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { wrapJsCodeInTryAndCatch } from '../utils/format-utils';

import { dedent } from './__utils__/string-utils';

describe('Format Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('M wrapJsCodeInTryCatch wraps JS code in try & catch with DD messaging W jsCode is not null', () => {
        it('M returns the JS code wrapped in try and catch', () => {
            // Given
            const jsCode = "console.log('test')";

            // When
            const wrappedCode = wrapJsCodeInTryAndCatch(jsCode);

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
        });

        it('M returns undefined W { jsCode = undefined }', () => {
            // Given
            const jsCode = undefined;
            // When
            const wrappedCode = wrapJsCodeInTryAndCatch(jsCode);
            // Then
            expect(wrappedCode).toBe(undefined);
        });
    });
});
