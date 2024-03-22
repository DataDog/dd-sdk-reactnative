/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
// Import this first to prevent require cycles
#if __has_include("DatadogSDKReactNative-Swift.h")
#import <DatadogSDKReactNative-Swift.h>
#else
#import <DatadogSDKReactNative/DatadogSDKReactNative-Swift.h>
#endif
#import "DdSdk.h"
#import <React/RCTBridge.h>

@implementation DdSdk

@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(initialize, withConfiguration:(NSDictionary*)configuration
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self initialize:configuration resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setAttributes, withAttributes:(NSDictionary*)attributes
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setAttributes:attributes resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setUser, withUser:(NSDictionary*)user
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setUser:user resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setTrackingConsent, withTrackingConsent:(NSString*)trackingConsent
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setTrackingConsent:trackingConsent resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(telemetryDebug, withMessage:(NSString*)message
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self telemetryDebug:message resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(telemetryError, withMessage:(NSString*)message
                 withStack:(NSString*)stack
                 withKind:(NSString*)kind
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self telemetryError:message stack:stack kind:kind resolve:resolve reject:reject];
}
                 
RCT_REMAP_METHOD(consumeWebviewEvent, withWebviewMessage:(NSString*)message
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self consumeWebviewEvent:message resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(clearAllData, withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self clearAllData:resolve reject:reject];
}

// Thanks to this guard, we won't compile this code when we build for the old architecture.
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdSdkSpecJSI>(params);
}
#endif


- (DdSdkImplementation*)ddSdkImplementation
{
    if (_ddSdkImplementation == nil) {
        _ddSdkImplementation = [[DdSdkImplementation alloc] initWithBridge:_bridge];
    }
    return _ddSdkImplementation;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

+ (void)initFromNative {
    DdSdkNativeInitialization *nativeInitialization = [[DdSdkNativeInitialization alloc] init];
    [nativeInitialization initializeFromNative];
}

- (dispatch_queue_t)methodQueue {
    return [RNQueue getSharedQueue];
}

- (void)consumeWebviewEvent:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation consumeWebviewEventWithMessage:message resolve:resolve reject:reject];
}

- (void)initialize:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation initializeWithConfiguration:configuration resolve:resolve reject:reject];
}

- (void)setAttributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setAttributesWithAttributes:attributes resolve:resolve reject:reject];
}

- (void)setTrackingConsent:(NSString *)trackingConsent resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setTrackingConsentWithTrackingConsent:trackingConsent resolve:resolve reject:reject];
}

- (void)setUser:(NSDictionary *)user resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setUserWithUser:user resolve:resolve reject:reject];
}

- (void)telemetryDebug:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation telemetryDebugWithMessage:message resolve:resolve reject:reject];
}

- (void)telemetryError:(NSString *)message stack:(NSString *)stack kind:(NSString *)kind resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation telemetryErrorWithMessage:message stack:stack kind:kind resolve:resolve reject:reject];
}

- (void)clearAllData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation clearAllDataWithResolve:resolve reject:reject];
}

@end
