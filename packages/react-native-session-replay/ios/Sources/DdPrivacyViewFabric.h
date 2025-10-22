/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// DdPrivacyViewFabric.h

#if RCT_NEW_ARCH_ENABLED
#import <React/RCTViewComponentView.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/ComponentDescriptors.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/EventEmitters.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/Props.h>
#import <react/renderer/components/DdSDKReactNativeSessionReplay/RCTComponentViewHelpers.h>
#import <React/RCTFabricComponentsPlugins.h>


#if __has_include("DatadogSDKReactNativeSessionReplay-Swift.h")
#import <DatadogSDKReactNativeSessionReplay-Swift.h>
#else
#import <DatadogSDKReactNativeSessionReplay/DatadogSDKReactNativeSessionReplay-Swift.h>
#endif

@interface DdPrivacyViewFabric : RCTViewComponentView
@property (nonatomic, copy) NSString *nativeID;
@property (nonatomic, copy) NSDictionary<NSString *, NSString *> *attributes;
@end
#endif
