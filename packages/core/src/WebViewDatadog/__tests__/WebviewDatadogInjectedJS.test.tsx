import { render } from '@testing-library/react-native';
import React from 'react';

import { WebView } from '../WebViewDatadog';

jest.mock('react-native-webview', () => {
    return {
        WebView: jest.fn(props => {
            // eslint-disable-next-line no-eval
            eval(props.injectedJavaScriptBeforeContentLoaded);
            return null;
        })
    };
});
const callfunction = jest.fn();

describe('Webview', () => {
    it('should pass injectedJavaScriptBeforeContentLoaded prop to WebView component', () => {
        const injectedJavaScriptBeforeContentLoaded = 'callfunction()';
        const allowedHosts = ['example.com', 'localhost'];
        render(
            <WebView
                allowedHosts={allowedHosts}
                injectedJavaScriptBeforeContentLoaded={
                    injectedJavaScriptBeforeContentLoaded
                }
            />
        );
        expect(callfunction).toHaveBeenCalled();
    });
});
