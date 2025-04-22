/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "DdViewManager.h"
#import "DdViewWrapper.h"
#import "DatadogSDKReactNativeSessionReplay-Swift.h"

@implementation DdViewManager

RCT_EXPORT_MODULE(DdView)

- (UIView *) view {
    return [[DdViewWrapper alloc] init];
}

RCT_CUSTOM_VIEW_PROPERTY(textAndInputPrivacy, NSString, DdViewWrapper) {
    NSLog(@"set TextAndInputPrivacy");
    view.textPrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(imagePrivacy, NSString, DdViewWrapper) {
    NSLog(@"set imagePrivacy");
    view.imagePrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(touchPrivacy, NSString, DdViewWrapper) {
    NSLog(@"set touchPrivacy");
    view.touchPrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(hide, BOOL, DdViewWrapper) {
    NSLog(@"set hide");
    view.hide = json ? [json boolValue] : NO;
    [self setPrivacyOverridesFor:view];
}

- (void) setPrivacyOverridesFor:(DdViewWrapper *) view {
    [DdPrivacyOverrider setOverridesFor:view textPrivacy:view.textPrivacy imagePrivacy:view.imagePrivacy touchPrivacy:view.touchPrivacy hide:view.hide];
}

//- (void) didSetProps: (NSArray<NSString *> *) changedProps forView:(DdViewWrapper *) view {
//    NSLog(@"OLD arch - didSetProps called");
//}

@end
