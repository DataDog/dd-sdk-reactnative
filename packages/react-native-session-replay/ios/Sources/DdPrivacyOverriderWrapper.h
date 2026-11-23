/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// Calls the Swift DdPrivacyOverrider for Objective-C++ code: under Swift Package Manager the Swift
// sources are a separate module, which Objective-C++ cannot import (see
// DatadogSDKReactNativeSessionReplaySwiftBridge.h).
@interface DdPrivacyOverriderWrapper : NSObject

+ (void)setOverridesForView:(UIView *)view
                textPrivacy:(nullable NSString *)textPrivacy
               imagePrivacy:(nullable NSString *)imagePrivacy
               touchPrivacy:(nullable NSString *)touchPrivacy
                       hide:(BOOL)hide;

@end

NS_ASSUME_NONNULL_END
