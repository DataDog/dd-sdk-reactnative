/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import { UIManager } from 'react-native';

const isNewArch =
    UIManager.getViewManagerConfig?.('DdPrivacyView') === undefined;

const NativeComponent = isNewArch
    ? require('./DdPrivacyViewNativeComponent').default
    : require('./DdPrivacyViewPaper').default;

export default NativeComponent;
