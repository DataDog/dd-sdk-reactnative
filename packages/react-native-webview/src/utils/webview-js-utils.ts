/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { NativeDdSdk } from '../ext-specs/NativeDdSdk';

export const DATADOG_MESSAGE_PREFIX = '[DATADOG]';

/**
 * Internal Datadog Message Type
 */
export type DatadogMessageType =
    /**
     * Signals errors that occured during the execution of JavaScript code in the WebView.
     */
    | 'ERROR'
    /**
     * Signals events that should be forwarded and consumed by the native SDK.
     */
    | 'NATIVE_EVENT';

/**
 * Internal Datadog Message Format.
 */
export type DatadogMessageFormat = {
    type: DatadogMessageType;
    message: string;
};

/**
 * Wraps the given JS Code in a try and catch block, including a
 * comment with the given allowedHosts in JSON format
 * @param javascriptCode The JS Code to wrap in a try and catch block.
 * @returns the wrapped JS code.
 */
export function wrapJsCodeWithAllowedHosts(
    javascriptCode?: string,
    allowedHosts?: string[]
): string | undefined {
    let jsCode = '';
    const hosts = formatAllowedHosts(allowedHosts);
    if (hosts) {
        jsCode = `// #allowedHosts=${JSON.stringify(allowedHosts)}\n`;
    }

    return javascriptCode
        ? `${jsCode}\n${wrapJsCodeInTryAndCatch(javascriptCode)}`
        : jsCode.trim().length > 0
        ? jsCode
        : undefined;
}

export function wrapJsCodeInTryAndCatch(
    javascriptCode: string | undefined
): string | undefined {
    return javascriptCode
        ? `try{
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
}

function formatAllowedHosts(allowedHosts?: string[]): string | undefined {
    try {
        if (!allowedHosts) {
            throw new Error('allowedHosts is undefined');
        }
        const jsonHosts = JSON.stringify(allowedHosts);
        if (!jsonHosts) {
            throw new Error(
                "JSON.stringify returned 'undefined' for the given hosts"
            );
        }
        return jsonHosts;
    } catch (e: any) {
        if (NativeDdSdk) {
            NativeDdSdk.telemetryError(
                getErrorMessage(e),
                getErrorStackTrace(e),
                'AllowedHostsError'
            );
        }
        console.warn(
            `[@datadog/mobile-react-native-webview] Invalid 'allowedHosts' format: ${e}`
        );
        return undefined;
    }
}

const getErrorMessage = (error: any | undefined): string => {
    const EMPTY_MESSAGE = 'Unknown Error';
    let message = EMPTY_MESSAGE;
    if (error === undefined || error === null) {
        message = EMPTY_MESSAGE;
    } else if (typeof error === 'object' && 'message' in error) {
        message = String(error.message);
    } else {
        message = String(error);
    }

    return message;
};

const getErrorStackTrace = (error: any | undefined): string => {
    const EMPTY_STACK_TRACE = '';
    let stack = EMPTY_STACK_TRACE;

    try {
        if (error === undefined || error === null) {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'string') {
            stack = EMPTY_STACK_TRACE;
        } else if (typeof error === 'object') {
            if ('stacktrace' in error) {
                stack = String(error.stacktrace);
            } else if ('stack' in error) {
                stack = String(error.stack);
            } else if ('componentStack' in error) {
                stack = String(error.componentStack);
            } else if (
                'sourceURL' in error &&
                'line' in error &&
                'column' in error
            ) {
                stack = `at ${error.sourceURL}:${error.line}:${error.column}`;
            }
        }
    } catch (e) {
        // Do nothing
    }
    return stack;
};
