/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// The TurboModule half of DdSessionReplay, the only part that needs C++. The rest of the module is in
// DdSessionReplay.m, which is Objective-C so that it can import the Swift sources under Swift Package
// Manager.

#import "DdSessionReplay.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <DdSDKReactNativeSessionReplay/DdSDKReactNativeSessionReplay.h>

@interface DdSessionReplay (TurboModule) <NativeDdSessionReplaySpec>
@end

@implementation DdSessionReplay (TurboModule)

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdSessionReplaySpecJSI>(params);
}

@end
#endif
