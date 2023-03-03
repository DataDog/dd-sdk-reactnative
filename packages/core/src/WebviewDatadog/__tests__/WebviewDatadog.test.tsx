import { fireEvent, render } from '@testing-library/react-native';
import { NativeModules } from 'react-native';
import React from 'react';

import { Webview } from '../WebviewDatadog';

describe('Webview', () => {
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
    it('calls provided onMessage props', async () => {
        const onMessage = jest.fn();
        const { findByTestId } = render(
            <Webview onMessage={onMessage} testID="webview" allowedHosts={[]} />
        );
        const userDefinedEvent = {
            nativeEvent: {
                data: 'custom user-defined message'
            }
        };
        const webview = await findByTestId('webview');

        fireEvent(webview, 'message', userDefinedEvent);
        expect(onMessage).toHaveBeenCalledWith(userDefinedEvent);

        fireEvent(webview, 'message', datadogEvent);
        expect(onMessage).toHaveBeenCalledTimes(1);
        expect(onMessage).not.toHaveBeenCalledWith(datadogEvent);
    });
    it('calls consumeWebviewEvent with Datadog logs', async () => {
        const { findByTestId } = render(
            <Webview testID="webview" allowedHosts={[]} />
        );
        const webview = await findByTestId('webview');
        fireEvent(webview, 'message', datadogEvent);

        expect(NativeModules.DdSdk.consumeWebviewEvent).toHaveBeenCalledWith(
            DdMessage
        );
    });
});
