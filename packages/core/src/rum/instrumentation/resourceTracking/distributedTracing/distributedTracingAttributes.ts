/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0. This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { PropagatorType } from '../../../types';

import type { SpanId, TraceId } from './TracingIdentifier';

export type DdRumResourceTracingAttributes =
    | {
          tracingStrategy: 'KEEP';
          traceId: TraceId;
          spanId: SpanId;
          samplingPriorityHeader: '1' | '0';
          rulePsr: number;
          propagatorTypes: PropagatorType[];
          rumSessionId?: string;
          userId?: string;
          accountId?: string;
          baggageHeaders?: Set<string>;
      }
    | {
          tracingStrategy: 'DISCARD';
          traceId?: void;
          spanId?: void;
          samplingPriorityHeader: '0';
      };
