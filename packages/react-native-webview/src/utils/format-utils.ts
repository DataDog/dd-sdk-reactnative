/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Wraps the given JS Code in a try and catch block.
 * @param javascriptCode The JS Code to wrap in a try and catch block.
 * @returns the wrapped JS code.
 */
export type DatadogMessageFormat = {
    type: 'ERROR';
    message: string;
};

export const wrapJsCodeInTryAndCatch = (
    javascriptCode?: string
): string | undefined =>
    javascriptCode
        ? `
    try{
      ${javascriptCode}
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        source: 'DATADOG',
        type: 'ERROR',
        message: errorMsg
      }));
      true;
    }`
        : undefined;
