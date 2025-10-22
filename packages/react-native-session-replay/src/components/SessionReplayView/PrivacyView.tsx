/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ViewProps } from 'react-native';
import React from 'react';

import type {
    ImagePrivacyLevel,
    TextAndInputPrivacyLevel,
    TouchPrivacyLevel
} from '../../SessionReplay';
import View from '../../specs/DdPrivacyView';
import type { Attributes } from '../../types/DdPrivacyView';

type Props = ViewProps & {
    /**
     * Controls how text and input fields are masked in session replays.
     */
    textAndInputPrivacy?: TextAndInputPrivacyLevel;
    /**
     * Controls how images are masked in session replays.
     */
    imagePrivacy?: ImagePrivacyLevel;
    /**
     * Controls whether touch interactions are shown or hidden in session replays.
     */
    touchPrivacy?: TouchPrivacyLevel;
    /**
     * When true, completely hides this view and its children from session replays.
     */
    hide?: boolean;
    /**
     * When set, allows the view to be uniquely identifiable in the native layer.
     */
    nativeID?: string;
    /**
     * When set, allows view attributes to be passed to the native layer.
     */
    attributes?: Attributes;
};

/**
 * A low-level component for configuring session replay privacy behavior with more granular control over the properties.
 *
 * Use this when none of the high-level components (`MaskAllView`, `MaskNoneView`, `HideView`)
 * provide the level of customization you need.
 *
 * You can individually configure:
 * - How text and inputs are masked
 * - Whether images are shown or masked
 * - Whether touch interactions are visible
 * - Whether the entire view should be hidden from replays
 */
export function PrivacyView({
    children,
    textAndInputPrivacy,
    imagePrivacy,
    touchPrivacy,
    nativeID,
    hide = false,
    ...props
}: Props) {
    return (
        <View
            {...props}
            textAndInputPrivacy={textAndInputPrivacy as string}
            imagePrivacy={imagePrivacy as string}
            touchPrivacy={touchPrivacy as string}
            hide={hide || false}
            nativeID={nativeID as string}
        >
            {children}
        </View>
    );
}
