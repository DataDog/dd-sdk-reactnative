import { fireEvent, render } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import React from 'react';

import { WebView } from '../WebViewDatadog';

describe('WebView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const DATADOG_MESSAGE_PREFIX = '[DATADOG]';
    const DdMessage = 'custom datadog event';
    const datadogEvent = {
        nativeEvent: {
            data: `${DATADOG_MESSAGE_PREFIX} ${DdMessage}`
        }
    };
    const userDefinedEvent = {
        nativeEvent: {
            data: 'custom user-defined message'
        }
    };
    it('calls provided onMessage props', async () => {
        const onMessage = jest.fn();
        const { findByTestId } = render(
            <WebView onMessage={onMessage} testID="webView" allowedHosts={[]} />
        );

        const webView = await findByTestId('webView');

        fireEvent(webView, 'message', userDefinedEvent);
        expect(onMessage).toHaveBeenCalledWith(userDefinedEvent);

        fireEvent(webView, 'message', datadogEvent);
        expect(onMessage).toHaveBeenCalledTimes(1);
        expect(onMessage).not.toHaveBeenCalledWith(datadogEvent);
    });
    it('calls consumeWebviewEvent with Datadog logs', async () => {
        const { findByTestId } = render(
            <WebView testID="webView" allowedHosts={[]} />
        );
        const webView = await findByTestId('webView');
        fireEvent(webView, 'message', datadogEvent);

        expect(NativeModules.DdSdk.consumeWebviewEvent).toHaveBeenCalledWith(
            DdMessage
        );
    });
});
