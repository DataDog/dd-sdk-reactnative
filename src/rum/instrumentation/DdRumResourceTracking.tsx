/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../index';
import type { DdRumXhr } from './DdRumXhrProxy';
/**
* Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
*/
export class DdRumResourceTracking {

  private static isTracking = false

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static originalXhrOpen: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static originalXhrSend: any

  /**
  * Starts tracking resources and sends a RUM Resource event every time a network request is detected.
  */
  static startTracking(): void {
    this.startTrackingInternal(XMLHttpRequest);
  }

  /**
  * Starts tracking resources and sends a RUM Resource event every time a fetch or XHR call is detected.
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  static startTrackingInternal(xhrType: any): void {
    // extra safety to avoid proxying the XHR class twice
    if (this.isTracking) {
      return
    }

    this.originalXhrOpen = xhrType.prototype.open;
    this.originalXhrSend = xhrType.prototype.send;

    this.proxyXhr(xhrType)
  }


  static stopTracking(): void {
    if (this.isTracking) {
      this.isTracking = false;
      XMLHttpRequest.prototype.open = this.originalXhrOpen;
      XMLHttpRequest.prototype.send = this.originalXhrSend;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  static proxyXhr(xhrType: any): void {
    this.proxyOpen(xhrType);
    this.proxySend(xhrType);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxyOpen(xhrType: any): void {
    const originalXhrOpen = this.originalXhrOpen;
    xhrType.prototype.open = function (this: DdRumXhr, method: string, url: string) {
      // Keep track of the method and url
      // start time is tracked by the `send` method
      this._datadog_xhr = {
        method,
        startTime: -1,
        url: url,
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
      return originalXhrOpen.apply(this, arguments as any)
    }    
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxySend(xhrType: any): void {
    const originalXhrSend = this.originalXhrSend;
    xhrType.prototype.send = function (this: DdRumXhr) {

      if (this._datadog_xhr) {
        // keep track of start time
        this._datadog_xhr.startTime = Date.now();
      }

      DdRumResourceTracking.proxyOnReadyStateChange(this, xhrType);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
      return originalXhrSend.apply(this, arguments as any);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static proxyOnReadyStateChange(xhrProxy: DdRumXhr, xhrType: any): void {
    const originalOnreadystatechange = xhrProxy.onreadystatechange

    xhrProxy.onreadystatechange = function () {
      if (xhrProxy.readyState === xhrType.DONE) {
        DdRumResourceTracking.reportXhr(xhrProxy)
      }

      if (originalOnreadystatechange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any,prefer-rest-params
        originalOnreadystatechange.apply(xhrProxy, arguments as any)
      }
    }
  }

  private static reportXhr(xhrProxy: DdRumXhr): void {
    const key = xhrProxy._datadog_xhr.startTime + "/" + xhrProxy._datadog_xhr.method + "/" + xhrProxy._datadog_xhr.startTime
    DdRum.startResource(
      key,
      xhrProxy._datadog_xhr.method, 
      xhrProxy._datadog_xhr.url,
      xhrProxy._datadog_xhr.startTime,
      {}
    ).then(() => {
      DdRum.stopResource(key, xhrProxy.status, "XHR", Date.now(), {});
    })               
  }
}
