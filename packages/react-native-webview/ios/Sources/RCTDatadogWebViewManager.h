/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// See the note in RCTDatadogWebView.h: this header resolves as a quoted import under CocoaPods'
// default static linkage, but only as <react_native_webview/...> when the pod is built as a
// dynamic framework.
#if __has_include(<react_native_webview/RNCWebViewManager.h>)
#import <react_native_webview/RNCWebViewManager.h>
#else
#import "RNCWebViewManager.h"
#endif

@interface RCTDatadogWebViewManager : RNCWebViewManager
@end
