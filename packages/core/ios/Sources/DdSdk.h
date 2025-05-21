/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTBridge.h>
#import <React/RCTReloadCommand.h>
#import <React/RCTUtils.h>

@class DdSdkImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdSdk : RCTEventEmitter <NativeDdSdkSpec, RCTBridgeModule, RCTReloadListener>

#else

#import <React/RCTBridgeModule.h>
@interface DdSdk : RCTEventEmitter <RCTBridgeModule, RCTReloadListener>

#endif

@property(nonatomic, strong) DdSdkImplementation * _Nonnull ddSdkImplementation;

+ (void)initFromNative;

@end
