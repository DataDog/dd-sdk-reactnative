/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { SessionReplayConfiguration } from './SessionReplay';
import {
    SessionReplay,
    SessionReplayPrivacy,
    ImagePrivacyLevel,
    TouchPrivacyLevel,
    TextAndInputPrivacyLevel
} from './SessionReplay';
import View from './specs/DdViewNativeComponent';

export {
    SessionReplay,
    SessionReplayPrivacy,
    ImagePrivacyLevel,
    TouchPrivacyLevel,
    TextAndInputPrivacyLevel
};

export { View };

export type { SessionReplayConfiguration };
