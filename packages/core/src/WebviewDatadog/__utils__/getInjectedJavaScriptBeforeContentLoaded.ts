import { formatAllowedHosts } from './formatAllowedHosts';

export const DATADOG_MESSAGE_PREFIX = '[DATADOG]';

export const getInjectedJavaScriptBeforeContentLoaded = (
    allowedHosts?: string[]
) =>
    `
      window.DatadogEventBridge = {
        send(msg) {
          window.ReactNativeWebView.postMessage("${DATADOG_MESSAGE_PREFIX} " + msg)
        },
        getAllowedWebViewHosts() {
          return ${formatAllowedHosts(allowedHosts)}
        }
      };
    `;
