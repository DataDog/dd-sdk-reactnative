import type { WebViewProps } from 'react-native-webview';
import { WebView as RNWebView } from 'react-native-webview';
import React from 'react';

import { formatAllowedHosts } from './formatAllowedHosts';

type Props = WebViewProps & {
    allowedHosts: string[];
};

export const Webview = (props: Props) => {
    return (
        <RNWebView
            {...props}
            onMessage={event => {
                const message = event.nativeEvent.data;
                // eslint-disable-next-line no-console
                console.log(message);
            }}
            injectedJavaScriptBeforeContentLoaded={`
              window.DatadogEventBridge = {
                send(msg) {
                  // TODO: add watermark to message
                  window.ReactNativeWebView.postMessage(msg)
                },
                getAllowedWebViewHosts() {
                  return ${formatAllowedHosts(props.allowedHosts)}
                }
              };
            `}
        />
    );
};

export default Webview;
