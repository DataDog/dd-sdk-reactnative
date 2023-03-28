/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
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
