/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0. This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Datadog headers
 */
export const SAMPLING_PRIORITY_HEADER_KEY = 'x-datadog-sampling-priority';
export const ORIGIN_HEADER_KEY = 'x-datadog-origin';
export const ORIGIN_RUM = 'rum';
export const TRACE_ID_HEADER_KEY = 'x-datadog-trace-id';
export const PARENT_ID_HEADER_KEY = 'x-datadog-parent-id';
export const TAGS_HEADER_KEY = 'x-datadog-tags';
export const DD_TRACE_ID_TAG = '_dd.p.tid';
export const DD_RUM_SESSION_ID_TAG = 'session.id';
export const DD_RUM_USER_ID_TAG = 'user.id';
export const DD_RUM_ACCOUNT_ID_TAG = 'account.id';

/**
 * OTel headers
 */
export const TRACECONTEXT_HEADER_KEY = 'traceparent';
export const TRACESTATE_HEADER_KEY = 'tracestate';
export const BAGGAGE_HEADER_KEY = 'baggage';
export const B3_HEADER_KEY = 'b3';
export const B3_MULTI_TRACE_ID_HEADER_KEY = 'X-B3-TraceId';
export const B3_MULTI_SPAN_ID_HEADER_KEY = 'X-B3-SpanId';
export const B3_MULTI_SAMPLED_HEADER_KEY = 'X-B3-Sampled';
