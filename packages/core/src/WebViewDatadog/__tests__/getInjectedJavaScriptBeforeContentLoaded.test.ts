/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
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
        Object.defineProperty(window, 'ReactNativeWebView', {
            value: {
                postMessage: jest.fn()
            },
            writable: true
        });
        delete (window as any).DatadogEventBridge;
    });
    it('posts the message and returns allowed webview hosts', () => {
        allowedHosts = ['example.com', 'localhost'];
        script = getInjectedJavaScriptBeforeContentLoaded(allowedHosts);
        eval(script);

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
    });
    it('uses our injected javascript and the user provided implementation', () => {
        allowedHosts = ['example.com', 'localhost'];
        const callfunction = jest.fn();
        const injectedJavaScriptBeforeContentLoaded = 'callfunction()';
        script = getInjectedJavaScriptBeforeContentLoaded(
            allowedHosts,
            injectedJavaScriptBeforeContentLoaded
        );
        eval(script);
        expect(callfunction).toHaveBeenCalled();
        // Posting the message
        (window as any).DatadogEventBridge.send(DdMessage);
        expect((window as any).ReactNativeWebView.postMessage).toBeCalledWith(
            `${DATADOG_MESSAGE_PREFIX} ${DdMessage}`
        );
    });
    it('executes our injected javascript when the user provided implementation throws an error', () => {
        allowedHosts = ['example.com', 'localhost'];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const callfunction = jest.fn().mockImplementation(() => {
            throw new Error('The user functions throws an error');
        });
        const injectedJavaScriptBeforeContentLoaded = 'callfunction()';
        script = getInjectedJavaScriptBeforeContentLoaded(
            allowedHosts,
            injectedJavaScriptBeforeContentLoaded
        );
        eval(script);
        expect(() => eval(injectedJavaScriptBeforeContentLoaded)).toThrow();
        // Posting the message
        (window as any).DatadogEventBridge.send(DdMessage);
        expect((window as any).ReactNativeWebView.postMessage).toBeCalledWith(
            `${DATADOG_MESSAGE_PREFIX} ${DdMessage}`
        );
    });
});
