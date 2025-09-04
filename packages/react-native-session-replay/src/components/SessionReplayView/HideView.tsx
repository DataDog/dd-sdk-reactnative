/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ViewProps } from 'react-native';
import React from 'react';

import { PrivacyView } from './PrivacyView';

/**
 * A wrapper component that hides all of its content from session replays.
 *
 * When used, none of the children within this view will appear in the replay recording.
 * This is useful for UI areas that contain sensitive or confidential information that should
 * be completely excluded from visibility, not just masked.
 */
export function HideView({ children, ...props }: ViewProps) {
    return (
        <PrivacyView {...props} hide={true}>
            {children}
        </PrivacyView>
    );
}
