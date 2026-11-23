/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTReloadCommand.h>
#import <React/RCTUtils.h>

@class DdSdkImplementation;

// This header must stay importable from Objective-C and Swift, so it does not import the C++
// TurboModule spec. DdSdk+TurboModule.mm adopts NativeDdSdkSpec; the methods below are the spec's
// methods, declared here so that the compiler checks that DdSdk implements them.
@interface DdSdk : RCTEventEmitter <RCTBridgeModule, RCTReloadListener>

@property(nonatomic, strong) DdSdkImplementation * _Nonnull ddSdkImplementation;

+ (void)initFromNative;

- (void)initialize:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addAttribute:(NSString *)key value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)removeAttribute:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addAttributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)removeAttributes:(NSArray *)keys resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)setUserInfo:(NSDictionary *)userInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)clearUserInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addUserExtraInfo:(NSDictionary *)extraInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)setAccountInfo:(NSDictionary *)accountInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)clearAccountInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)addAccountExtraInfo:(NSDictionary *)extraInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)setTrackingConsent:(NSString *)trackingConsent resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)sendTelemetryLog:(NSString *)message attributes:(NSDictionary *)attributes config:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)telemetryDebug:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)telemetryError:(NSString *)message stack:(NSString *)stack kind:(NSString *)kind resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
#if TARGET_OS_IOS
- (void)consumeWebviewEvent:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
#endif
- (void)clearAllData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;

@end
