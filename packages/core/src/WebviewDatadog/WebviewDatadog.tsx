import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { WebView as RNWebView } from 'react-native-webview';
import { NativeModules } from 'react-native';
import React from 'react';

import {
    DATADOG_MESSAGE_PREFIX,
    getInjectedJavaScriptBeforeContentLoaded
} from './__utils__/getInjectedJavaScriptBeforeContentLoaded';

type Props = WebViewProps & {
    allowedHosts?: string[];
};

export const Webview = (props: Props) => {
    const onMessage = (event: WebViewMessageEvent) => {
        const message = event.nativeEvent.data;

        if (message.startsWith(DATADOG_MESSAGE_PREFIX)) {
            NativeModules.DdSdk.consumeWebviewEvent(
                message.substring(DATADOG_MESSAGE_PREFIX.length + 1)
            );
        } else {
            props.onMessage?.(event);
        }
    };
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

export default Webview;
