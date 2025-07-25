/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdBabelInteractionTracking } from '../rum/instrumentation/interactionTracking/DdBabelInteractionTracking';

export const getBabelTelemetryConfig = () => {
    return {
        babel_plugin: {
            enabled: !!globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__,
            track_interactions: !!DdBabelInteractionTracking.config
                .trackInteractions
        }
    };
};
