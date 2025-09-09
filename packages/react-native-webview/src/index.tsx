/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { WebView as RNWebView } from 'react-native-webview';
import React, { forwardRef, useCallback } from 'react';

import NativeDdLogs from './ext-specs/NativeDdLogs';
import { NativeDdWebViewLegacy } from './specs/NativeDdWebViewLegacy';
import { NativeDdWebView } from './specs/NativeDdWebView';
import { isNewArchitecture } from './utils/env-utils';
import {
    getWebViewEventBridgingJS,
    wrapJsCodeInTryAndCatch
} from './utils/webview-js-utils';
import type { DatadogMessageFormat } from './utils/webview-js-utils';

type Props = WebViewProps & {
    /**
     * The list of allowed hosts for Datadog WebView tracking.
     */
    allowedHosts?: string[];
    /**
     * Whether injected User JS Code errors should be logged to Datadog (default: false).
     */
    logUserCodeErrors?: boolean;
    /**
     * Custom JS Code to inject before the WebView content is loaded.
     */
    injectedJavaScriptBeforeContentLoaded?: string;
};

const WebViewComponent = (props: Props, ref: React.Ref<RNWebView<Props>>) => {
    const userDefinedOnMessage = props.onMessage;

    const onMessage = useCallback(
        (event: WebViewMessageEvent) => {
            const handleDatadogMessage = (ddMessage: DatadogMessageFormat) => {
                if (
                    ddMessage.type === 'ERROR' &&
                    ddMessage.message != null &&
                    (props.logUserCodeErrors ?? false)
                ) {
                    NativeDdLogs?.error(ddMessage.message, {});
                } else if (
                    ddMessage.type === 'NATIVE_EVENT' &&
                    ddMessage.message != null
                ) {
                    NativeDdWebViewLegacy?.consumeWebviewEvent(
                        ddMessage.message
                    );
                }
            };

            const message = event.nativeEvent.data;
            if (message == null) {
                return;
            }

            try {
                const jsonMsg = JSON.parse(message);
                if (jsonMsg && jsonMsg.source === 'DATADOG') {
                    handleDatadogMessage(jsonMsg);
                } else {
                    userDefinedOnMessage?.(event);
                }
            } catch (err) {
                userDefinedOnMessage?.(event);
            }
        },
        [userDefinedOnMessage, props.logUserCodeErrors]
    );

    const getInjectedJavascriptBeforeContentLoaded = (): string | undefined => {
        if (isNewArchitecture()) {
            return getWebViewEventBridgingJS(
                props.allowedHosts,
                props.injectedJavaScriptBeforeContentLoaded
            );
        } else {
            return wrapJsCodeInTryAndCatch(
                props.injectedJavaScriptBeforeContentLoaded
            );
        }
    };

    return (
        <RNWebView
            {...props}
            onMessage={onMessage}
            nativeConfig={{
                component: NativeDdWebView,
                props: {
                    allowedHosts: props.allowedHosts
                }
            }}
            injectedJavaScript={wrapJsCodeInTryAndCatch(
                props.injectedJavaScript
            )}
            injectedJavaScriptBeforeContentLoaded={getInjectedJavascriptBeforeContentLoaded()}
            ref={ref}
        />
    );
};

export const WebView = forwardRef(WebViewComponent);

// eslint-disable-next-line import/no-default-export
export default WebView;
