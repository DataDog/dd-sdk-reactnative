/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { WebView as RNWebView } from 'react-native-webview';
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import React, { useCallback } from 'react';

import {
    DATADOG_MESSAGE_PREFIX,
    getInjectedJavaScriptBeforeContentLoaded
} from './__utils__/getInjectedJavaScriptBeforeContentLoaded';

type Props = WebViewProps & {
    allowedHosts?: string[];
    injectedJavaScriptBeforeContentLoaded?: string;
};

export const WebView = (props: Props) => {
    const userDefinedOnMessage = props.onMessage;
    const onMessage = useCallback(
        (event: WebViewMessageEvent) => {
            const message = event.nativeEvent.data;
            if (message.startsWith(DATADOG_MESSAGE_PREFIX)) {
                NativeDdSdk?.consumeWebviewEvent(
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
                props.allowedHosts,
                props.injectedJavaScriptBeforeContentLoaded
            )}
        />
    );
};

export default WebView;

/**
 * We have to redefine the spec for the Native SDK here to be able to use the new architecture.
 * We don't declare it in a separate file so we don't end up with a duplicate definition of the native module.
 */
interface PartialNativeDdSdkSpec extends TurboModule {
    consumeWebviewEvent(message: string): Promise<void>;
}
const NativeDdSdk = TurboModuleRegistry.get<PartialNativeDdSdkSpec>('DdSdk');
