import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { WebView as RNWebView } from 'react-native-webview';
import { NativeModules } from 'react-native';
import React, { useCallback } from 'react';

import {
    DATADOG_MESSAGE_PREFIX,
    getInjectedJavaScriptBeforeContentLoaded
} from './__utils__/getInjectedJavaScriptBeforeContentLoaded';

type Props = WebViewProps & {
    allowedHosts?: string[];
};

export const WebView = (props: Props) => {
    const userDefinedOnMessage = props.onMessage;
    const onMessage = useCallback(
        (event: WebViewMessageEvent) => {
            const message = event.nativeEvent.data;
            if (message.startsWith(DATADOG_MESSAGE_PREFIX)) {
                NativeModules.DdSdk.consumeWebviewEvent(
                    message.substring(DATADOG_MESSAGE_PREFIX.length + 1)
                );
            } else {
                userDefinedOnMessage?.(event);
            }
        },
        [userDefinedOnMessage]
    );
    return (
        <RNWebView
            {...props}
            onMessage={onMessage}
            injectedJavaScriptBeforeContentLoaded={getInjectedJavaScriptBeforeContentLoaded(
                props.allowedHosts
            )}
        />
    );
};
