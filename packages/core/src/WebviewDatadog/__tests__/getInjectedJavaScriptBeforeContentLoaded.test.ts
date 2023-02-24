/* eslint-disable no-eval */
import {
    getInjectedJavaScriptBeforeContentLoaded,
    DATADOG_MESSAGE_PREFIX
} from '../__utils__/getInjectedJavaScriptBeforeContentLoaded';

describe('getInjectedJavaScriptBeforeContentLoaded', () => {
    const DdMessage = 'custom datadog event';
    let allowedHosts: string[];
    let script: string;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('posts the message and returns allowed webview hosts', () => {
        allowedHosts = ['example.com', 'localhost'];
        script = getInjectedJavaScriptBeforeContentLoaded(allowedHosts);
        eval(script);
        Object.defineProperty(window, 'ReactNativeWebView', {
            value: {
                postMessage: jest.fn()
            },
            writable: true
        });

        // Posting the message
        (window as any).DatadogEventBridge.send(DdMessage);
        expect((window as any).ReactNativeWebView.postMessage).toBeCalledWith(
            `${DATADOG_MESSAGE_PREFIX} ${DdMessage}`
        );

        // Getting the allowed hosts
        expect(
            (window as any).DatadogEventBridge.getAllowedWebViewHosts()
        ).toBe('["example.com","localhost"]');
    });
    it('should return an empty array for getAllowedWebViewHosts if no hosts are given', () => {
        allowedHosts = [];
        script = getInjectedJavaScriptBeforeContentLoaded(allowedHosts);
        eval(script);

        expect(
            (window as any).DatadogEventBridge.getAllowedWebViewHosts()
        ).toBe('[]');

        script = getInjectedJavaScriptBeforeContentLoaded();
        eval(script);
        expect(
            (window as any).DatadogEventBridge.getAllowedWebViewHosts()
        ).toBe('[]');
    });
});
