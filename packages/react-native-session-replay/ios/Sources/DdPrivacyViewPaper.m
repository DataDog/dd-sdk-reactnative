/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <React/RCTViewManager.h>
#if __has_include("DatadogSDKReactNativeSessionReplay-Swift.h")
#import <DatadogSDKReactNativeSessionReplay-Swift.h>
#else
#import <DatadogSDKReactNativeSessionReplay/DatadogSDKReactNativeSessionReplay-Swift.h>
#endif

@interface DdPrivacyView : UIView

@property (nonatomic, strong) NSString *textPrivacy;
@property (nonatomic, strong) NSString *imagePrivacy;
@property (nonatomic, strong) NSString *touchPrivacy;
@property (nonatomic, assign) BOOL hide;
@property (nonatomic, copy) NSString *nativeID;

@property (nonatomic, copy) NSDictionary<NSString *, NSString *> *attributes;

@end

@implementation DdPrivacyView
@end


@interface DdPrivacyViewPaper : RCTViewManager
@end

@implementation DdPrivacyViewPaper

RCT_EXPORT_MODULE(DdPrivacyView)

- (UIView *) view {
    return [[DdPrivacyView alloc] init];
}

RCT_CUSTOM_VIEW_PROPERTY(textAndInputPrivacy, NSString, DdPrivacyView) {
    view.textPrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(imagePrivacy, NSString, DdPrivacyView) {
    view.imagePrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(touchPrivacy, NSString, DdPrivacyView) {
    view.touchPrivacy = [RCTConvert NSString:json];
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(hide, BOOL, DdPrivacyView) {
    view.hide = json ? [json boolValue] : NO;
    [self setPrivacyOverridesFor:view];
}

RCT_CUSTOM_VIEW_PROPERTY(nativeID, NSString, DdPrivacyView) {
    view.nativeID = [RCTConvert NSString:json];
}

RCT_CUSTOM_VIEW_PROPERTY(attributes, NSDictionary, DdPrivacyView) {
    if (json && [json isKindOfClass:[NSDictionary class]]) {
        NSMutableDictionary<NSString *, NSString *> *dict = [NSMutableDictionary new];
        for (id key in json) {
            id value = json[key];
            if ([key isKindOfClass:[NSString class]] && [value isKindOfClass:[NSString class]]) {
                dict[key] = value;
            } else if ([key isKindOfClass:[NSString class]] && value != [NSNull null]) {
                dict[key] = [value description];
            }
        }
        view.attributes = dict;
    } else {
        view.attributes = nil;
    }
}

- (void) setPrivacyOverridesFor:(DdPrivacyView *) view {
    [DdPrivacyOverrider setOverridesFor:view textPrivacy:view.textPrivacy imagePrivacy:view.imagePrivacy touchPrivacy:view.touchPrivacy hide:view.hide];
}

@end
