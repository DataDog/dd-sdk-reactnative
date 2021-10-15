/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { Platform } from 'react-native';
import { DdRum } from '../../foundation'
import Timer from '../../Timer';
import type { DdRumXhr } from './DdRumXhr'
import { generateTraceId } from './TraceIdentifier';

export const TRACE_ID_HEADER_KEY = "x-datadog-trace-id"
export const PARENT_ID_HEADER_KEY = "x-datadog-parent-id"
export const ORIGIN_HEADER_KEY = "x-datadog-origin"
export const ORIGIN_RUM = "rum"

const RESPONSE_START_LABEL = "response_start"
const MISSING_RESOURCE_SIZE = -1

interface Timing {
  /**
   * Time relative (absolute in case of iOS) to some point, in ns.
   */
  startTime: number
  /**
   * Duration in ns.
   */
  duration: number
}

interface ResourceTimings {
  // unlike in Performance API it is not the time until request
  // starts (requestStart, before it can be connect, SSL, DNS),
  // but the time until the response is first seen
  firstByte: Timing,
  download: Timing,
  // required by iOS, total timing from the beginning to the end
  fetch: Timing
}

function createTimings(startTime: number,
  responseStartTime: number, responseEndTime: number): ResourceTimings {

  const firstByte = formatTiming(startTime, startTime, responseStartTime)
  const download = formatTiming(startTime, responseStartTime, responseEndTime)
  // needed for iOS, simply total duration from start to end
  const fetch = formatTiming(startTime, startTime, responseEndTime)

  return {
    firstByte,
    download,
    fetch
  }
}

/**
 * @param origin Start time (absolute) of the request
 * @param start Start time (absolute) of the timing
 * @param end End time (absolute) of the timing
 */
function formatTiming(origin: number, start: number, end: number): Timing {
  return {
    duration: timeToNanos(end - start),
    // if it is Android, startTime should be relative to the origin,
    // if it is iOS - absolute (unix timestamp)
    startTime: Platform.OS === 'ios' ? timeToNanos(start) : timeToNanos(start - origin)
  }
}

function timeToNanos(durationMs: number): number {
  return +(durationMs * 1e6).toFixed(0)
}

function byteLength(str: string): number {
  // This is a weird trick, but it works.
  // Output is the same as TextEncoder.encode(...).length
  return unescape(encodeURI(str)).length;
}

function getResponseContentLengthFromHeader(xhr: XMLHttpRequest): number | null {
  const contentLengthHeader = parseInt(xhr.getResponseHeader('Content-Length') ?? '', 10);
  if (!isNaN(contentLengthHeader)) {
    return contentLengthHeader;
  }
  return null;
}

export function calculateResponseSize(xhr: XMLHttpRequest): number {

  const contentLengthHeader = getResponseContentLengthFromHeader(xhr);
  if (contentLengthHeader != null) {
    return contentLengthHeader as number;
  }

  const response = xhr.response
  if (!response) {
    return MISSING_RESOURCE_SIZE;
  }

  let size;
  try {
    switch (xhr.responseType) {
      case '':
      case 'text':
        // String
        size = byteLength(response);
        break;
      case 'blob':
        size = response.size;
        break;
      case 'arraybuffer':
        size = response.byteLength;
        break;
      case 'document':
        // currently not supported by RN as of 0.66
        // HTML Document or XML Document
        break;
      case 'json':
        // plain JS object
        // original size was lost, because this is the object which was parsed.
        // We can only convert back to the string and calculate the size,
        // which will roughly match original.
        size = byteLength(JSON.stringify(response))
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("Couldn't get resource size, because of the error", e);
  }

  if (typeof size !== 'number') {
    return MISSING_RESOURCE_SIZE;
  }
  return size;
}

/**
* Provides RUM auto-instrumentation feature to track resources (fetch, XHR, axios) as RUM events.
*/
export class DdRumResourceTracking {

  private static isTracking = false

  private static originalXhrOpen: any
  private static originalXhrSend: any

  /**
  * Starts tracking resources and sends a RUM Resource event every time a network request is detected.
  */
  static startTracking(): void {
    DdRumResourceTracking.startTrackingInternal(XMLHttpRequest);
  }

  /**
  * Starts tracking resources and sends a RUM Resource event every time a fetch or XHR call is detected.
  */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static startTrackingInternal(xhrType: any): void {
    // extra safety to avoid proxying the XHR class twice
    if (DdRumResourceTracking.isTracking) {
      return
    }

    DdRumResourceTracking.originalXhrOpen = xhrType.prototype.open;
    DdRumResourceTracking.originalXhrSend = xhrType.prototype.send;

    DdRumResourceTracking.proxyXhr(xhrType)
  }


  static stopTracking(): void {
    if (DdRumResourceTracking.isTracking) {
      DdRumResourceTracking.isTracking = false;
      XMLHttpRequest.prototype.open = DdRumResourceTracking.originalXhrOpen;
      XMLHttpRequest.prototype.send = DdRumResourceTracking.originalXhrSend;
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static proxyXhr(xhrType: any): void {
    this.proxyOpen(xhrType);
    this.proxySend(xhrType);
  }

  private static proxyOpen(xhrType: any): void {
    const originalXhrOpen = this.originalXhrOpen;
    xhrType.prototype.open = function (this: DdRumXhr, method: string, url: string) {
      // Keep track of the method and url
      // start time is tracked by the `send` method
      const spanId = generateTraceId()
      const traceId = generateTraceId()
      this._datadog_xhr = {
        method,
        url: url,
        reported: false,
        timer: new Timer(),
        spanId: spanId,
        traceId: traceId
      }
      // eslint-disable-next-line prefer-rest-params
      return originalXhrOpen.apply(this, arguments as any)
    }
  }

  private static proxySend(xhrType: any): void {
    const originalXhrSend = this.originalXhrSend;
    xhrType.prototype.send = function (this: DdRumXhr) {

      if (this._datadog_xhr) {
        // keep track of start time
        this._datadog_xhr.timer.start()
        this.setRequestHeader(TRACE_ID_HEADER_KEY, this._datadog_xhr.traceId)
        this.setRequestHeader(PARENT_ID_HEADER_KEY, this._datadog_xhr.spanId)
        this.setRequestHeader(ORIGIN_HEADER_KEY, ORIGIN_RUM)

      }

      DdRumResourceTracking.proxyOnReadyStateChange(this, xhrType);

      // eslint-disable-next-line prefer-rest-params
      return originalXhrSend.apply(this, arguments as any);
    }
  }

  private static proxyOnReadyStateChange(xhrProxy: DdRumXhr, xhrType: any): void {
    const originalOnreadystatechange = xhrProxy.onreadystatechange
    xhrProxy.onreadystatechange = function () {
      if (xhrProxy.readyState === xhrType.DONE) {
        if (!xhrProxy._datadog_xhr.reported) {
          DdRumResourceTracking.reportXhr(xhrProxy);
          xhrProxy._datadog_xhr.reported = true;
        }
      } else if (xhrProxy.readyState === xhrType.HEADERS_RECEIVED) {
        xhrProxy._datadog_xhr.timer.recordTick(RESPONSE_START_LABEL)
      }

      if (originalOnreadystatechange) {
        // eslint-disable-next-line prefer-rest-params
        originalOnreadystatechange.apply(xhrProxy, arguments as any)
      }
    }
  }

  private static reportXhr(xhrProxy: DdRumXhr): void {

    const responseSize = calculateResponseSize(xhrProxy)

    const context = xhrProxy._datadog_xhr

    const key = context.timer.startTime + "/" + context.method

    context.timer.stop()

    DdRum.startResource(
      key,
      context.method,
      context.url,
      {
        "_dd.span_id": context.spanId,
        "_dd.trace_id": context.traceId
      },
      context.timer.startTime
    ).then(() => {
      DdRum.stopResource(
        key,
        xhrProxy.status,
        "xhr",
        responseSize,
        {
          "_dd.resource_timings": context.timer.hasTickFor(RESPONSE_START_LABEL) ?
            createTimings(
              context.timer.startTime,
              context.timer.timeAt(RESPONSE_START_LABEL),
              context.timer.stopTime
            ) : null
        },
        context.timer.stopTime
      );
    })
  }

}
