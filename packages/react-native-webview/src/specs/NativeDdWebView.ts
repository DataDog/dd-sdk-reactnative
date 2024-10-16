/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { CommonNativeWebViewProps } from 'react-native-webview/lib/WebViewTypes';
import { requireNativeComponent } from 'react-native';

const NativeDdWebView = requireNativeComponent<CommonNativeWebViewProps>(
    'DdReactNativeWebView'
);

export { NativeDdWebView };
