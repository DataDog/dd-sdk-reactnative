/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumEvent, WireframeType } from 'rum-events-format';

import type { SessionReplayEvent } from '../../types/events';

import { findViewWireframes, findViewTextWireframe } from './findWireframe';
import { buildTextWireframeAssertions } from './textWireframeAssertions';
import { buildWireframesAssertions } from './wireframesAssertions';

export const buildSessionReplayAssertions = (
    events: SessionReplayEvent[],
    rumEvents: RumEvent[]
) => {
    return {
        findViewWireframes: (
            type: WireframeType,
            matchers: { viewName: string }
        ) => {
            const wireframes = findViewWireframes(
                type,
                events,
                rumEvents,
                matchers
            );
            return buildWireframesAssertions(wireframes);
        },
        findViewTextWireframe: (matchers: {
            viewName: string;
            text: string;
        }) => {
            const wireframes = findViewTextWireframe(
                events,
                rumEvents,
                matchers
            );
            return buildTextWireframeAssertions(wireframes);
        }
    };
};
