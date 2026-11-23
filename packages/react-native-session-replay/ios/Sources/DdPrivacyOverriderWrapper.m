/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "DatadogSDKReactNativeSessionReplaySwiftBridge.h"
#import "DdPrivacyOverriderWrapper.h"

@implementation DdPrivacyOverriderWrapper

+ (void)setOverridesForView:(UIView *)view
                textPrivacy:(NSString *)textPrivacy
               imagePrivacy:(NSString *)imagePrivacy
               touchPrivacy:(NSString *)touchPrivacy
                       hide:(BOOL)hide {
    [DdPrivacyOverrider setOverridesFor:view
                            textPrivacy:textPrivacy
                           imagePrivacy:imagePrivacy
                           touchPrivacy:touchPrivacy
                                   hide:hide];
}

@end
