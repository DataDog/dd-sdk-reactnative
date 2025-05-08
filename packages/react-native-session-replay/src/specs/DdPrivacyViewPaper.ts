/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { requireNativeComponent } from 'react-native';

import type { DdPrivacyViewProps } from '../types/DdPrivacyView';

const DdPrivacyView = requireNativeComponent<DdPrivacyViewProps>(
    'DdPrivacyView'
);

export default DdPrivacyView;
