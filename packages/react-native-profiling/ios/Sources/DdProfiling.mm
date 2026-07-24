/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#if __has_include("DatadogSDKReactNativeProfiling-Swift.h")
#import <DatadogSDKReactNativeProfiling-Swift.h>
#else
#import <DatadogSDKReactNativeProfiling/DatadogSDKReactNativeProfiling-Swift.h>
#endif
#import "DdProfiling.h"


@implementation DdProfiling

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(enable, withEnableApplicationLaunchSampleRate:(double)applicationLaunchSampleRate
                 withContinuousSampleRate:(double)continuousSampleRate
                 withCustomEndpoint:(NSString*)customEndpoint
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self enable:applicationLaunchSampleRate
          continuousSampleRate:continuousSampleRate
          customEndpoint:customEndpoint
          resolve:resolve
          reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdProfilingSpecJSI>(params);
}
#endif

- (DdProfilingImplementation*)ddProfilingImplementation
{
    if (_ddProfilingImplementation == nil) {
        _ddProfilingImplementation = [[DdProfilingImplementation alloc] init];
    }
    return _ddProfilingImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)enable:(double)applicationLaunchSampleRate
        continuousSampleRate:(double)continuousSampleRate
        customEndpoint:(NSString*)customEndpoint
        resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject {
    [self.ddProfilingImplementation enableWithApplicationLaunchSampleRate:applicationLaunchSampleRate
                                                      continuousSampleRate:continuousSampleRate
                                                             customEndpoint:customEndpoint
                                                                    resolve:resolve
                                                                     reject:reject];
}

@end
