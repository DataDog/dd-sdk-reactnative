/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdRum } from '../../foundation'
import type { DdRumXhr } from './DdRumXhr'
import { generateTraceId } from './TraceIdentifier';

export const TRACE_ID_HEADER_KEY = "x-datadog-trace-id"
export const PARENT_ID_HEADER_KEY = "x-datadog-parent-id"
export const ORIGIN_HEADER_KEY = "x-datadog-origin"
export const ORIGIN_RUM = "rum"

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
      const spanId = generateTraceId()
      const traceId = generateTraceId()
      this._datadog_xhr = {
        method,
        startTime: -1,
        url: url,
        reported: false,
        spanId: spanId,
        traceId: traceId
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
        this.setRequestHeader(TRACE_ID_HEADER_KEY, this._datadog_xhr.traceId)
        this.setRequestHeader(PARENT_ID_HEADER_KEY, this._datadog_xhr.spanId)
        this.setRequestHeader(ORIGIN_HEADER_KEY, ORIGIN_RUM)

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
        if (!xhrProxy._datadog_xhr.reported) {
          DdRumResourceTracking.reportXhr(xhrProxy);
          xhrProxy._datadog_xhr.reported = true;
        }
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
      {
        "_dd.span_id": xhrProxy._datadog_xhr.spanId,
        "_dd.trace_id": xhrProxy._datadog_xhr.traceId
      }
    ).then(() => {
      DdRum.stopResource(key, xhrProxy.status, "xhr", Date.now(), {});
    })
  }

}
