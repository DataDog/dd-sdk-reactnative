/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { ViewProps } from 'react-native';

export type Attributes = {
    type?: string;
    hash?: string;
    width?: string;
    height?: string;
};

export interface DdPrivacyViewProps extends ViewProps {
    textAndInputPrivacy: string;
    imagePrivacy: string;
    touchPrivacy: string;
    hide: boolean;
    nativeID: string;
    attributes: Attributes;
}
