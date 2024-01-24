/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#if __has_include("DatadogSDKReactNativeSessionReplay-Swift.h")
#import <DatadogSDKReactNativeSessionReplay-Swift.h>
#else
#import <DatadogSDKReactNativeSessionReplay/DatadogSDKReactNativeSessionReplay-Swift.h>
#endif
#import "DdSessionReplay.h"


@implementation DdSessionReplay

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(enable, withEnableReplaySampleRate:(double)replaySampleRate
                 withDefaultPrivacyLevel:(NSString*)defaultPrivacyLevel
                 withCustomEndpoint:(NSString*)customEndpoint
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self enable:replaySampleRate defaultPrivacyLevel:defaultPrivacyLevel customEndpoint:customEndpoint resolve:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdSessionReplaySpecJSI>(params);
}
#endif

- (DdSessionReplayImplementation*)ddSessionReplayImplementation
{
    if (_ddSessionReplayImplementation == nil) {
        _ddSessionReplayImplementation = [[DdSessionReplayImplementation alloc] initWithBridge:_bridge];
    }
    return _ddSessionReplayImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)enable:(double)replaySampleRate defaultPrivacyLevel:(NSString *)defaultPrivacyLevel customEndpoint:(NSString*)customEndpoint resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSessionReplayImplementation enableWithReplaySampleRate:replaySampleRate defaultPrivacyLevel:defaultPrivacyLevel customEndpoint:customEndpoint resolve:resolve reject:reject];
}

@end
