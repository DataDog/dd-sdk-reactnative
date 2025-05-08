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

type Props = ViewProps & {
    /**
     * When true, allows touch interactions to be recorded.
     * When false (default), touch interactions are hidden.
     */
    showTouch?: boolean;
};

/**
 * A wrapper component that enforces full masking on all content within it.
 *
 * This includes:
 * - Masking all text and input values (e.g., replacing them with asterisks)
 * - Masking all images
 * - Hiding or optionally showing touch interactions, depending on `showTouch`
 *
 * This component is useful for marking sensitive UI sections that should not be visible
 * in session replays.
 */
export function MaskAllView({ children, showTouch, ...props }: Props) {
    const touchPrivacy = showTouch
        ? TouchPrivacyLevel.SHOW
        : TouchPrivacyLevel.HIDE;

    return (
        <PrivacyView
            {...props}
            textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_ALL}
            imagePrivacy={ImagePrivacyLevel.MASK_ALL}
            touchPrivacy={touchPrivacy}
            hide={false}
        >
            {children}
        </PrivacyView>
    );
}
