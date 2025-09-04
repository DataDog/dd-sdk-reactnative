/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ViewProps } from 'react-native';
import React from 'react';

import {
    ImagePrivacyLevel,
    TextAndInputPrivacyLevel,
    TouchPrivacyLevel
} from '../../SessionReplay';

import { PrivacyView } from './PrivacyView';

/**
 * A wrapper component that applies minimal masking, allowing most content to appear as-is in session replays.
 *
 * Specifically:
 * - Text and inputs are shown, except for sensitive fields (e.g., password fields), which are still masked.
 * - Images are fully visible.
 * - Touch interactions are recorded and visible.
 *
 * Use this component for UI areas where full visibility is acceptable and privacy concerns are minimal.
 */
export function MaskNoneView({ children, ...props }: ViewProps) {
    return (
        <PrivacyView
            {...props}
            textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS}
            imagePrivacy={ImagePrivacyLevel.MASK_NONE}
            touchPrivacy={TouchPrivacyLevel.SHOW}
            hide={false}
        >
            {children}
        </PrivacyView>
    );
}
