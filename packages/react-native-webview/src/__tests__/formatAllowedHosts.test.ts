/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { wrapJsCodeInTryAndCatch } from '../utils/format-utils';

describe('Format Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Wrap JS Code in Try & Catch', () => {
        it('returns the JS code wrapped in try and catch', () => {
            const jsCode = "console.log('test')";
            const wrappedCode = wrapJsCodeInTryAndCatch(jsCode);
            expect(wrappedCode).toBe(`
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
        });
    });
});
