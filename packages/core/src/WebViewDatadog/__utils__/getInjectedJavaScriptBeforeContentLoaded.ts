/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { formatAllowedHosts } from './formatAllowedHosts';

export const DATADOG_MESSAGE_PREFIX = '[DATADOG]';

export const getInjectedJavaScriptBeforeContentLoaded = (
    allowedHosts?: string[],
    injectedJavaScriptBeforeContentLoaded?: string
): string =>
    `
    window.DatadogEventBridge = {
      send(msg) {
        window.ReactNativeWebView.postMessage("${DATADOG_MESSAGE_PREFIX} " + msg)
      },
      getAllowedWebViewHosts() {
        return ${formatAllowedHosts(allowedHosts)}
      }
    };
    try{      
      ${injectedJavaScriptBeforeContentLoaded}
    }
    catch (error) {
      // The user defined code has crashed
    }
  `;
