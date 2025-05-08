/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { HostComponent, ViewProps } from 'react-native';

interface DdPrivacyViewProps extends ViewProps {
    textAndInputPrivacy: string;
    imagePrivacy: string;
    touchPrivacy: string;
    hide: boolean;
}

export default codegenNativeComponent<DdPrivacyViewProps>('DdPrivacyView', {
    paperComponentName: 'DdPrivacyView'
}) as HostComponent<DdPrivacyViewProps>;
