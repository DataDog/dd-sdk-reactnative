/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// The TurboModule half of DdFlags, the only part that needs C++. The rest of the module is in
// DdFlags.m, which is Objective-C so that it can import the Swift sources under Swift Package
// Manager.

#import "DdFlags.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <DdSdkReactNative/DdSdkReactNative.h>

@interface DdFlags (TurboModule) <NativeDdFlagsSpec>
@end

@implementation DdFlags (TurboModule)

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdFlagsSpecJSI>(params);
}

@end
#endif
