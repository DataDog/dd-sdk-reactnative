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

@implementation DdSdk

static __weak RCTBridge *_bridge = nil;

/// This method can be called from AppDelegate to initialize the SDK from the native layer, to be able to catch startup errors and logs.
+ (void)initFromNative {
    DdSdkNativeInitialization *nativeInitialization = [[DdSdkNativeInitialization alloc] init];
    [nativeInitialization initializeFromNative];
}

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

RCT_REMAP_METHOD(setUserInfo, withUserInfo:(NSDictionary*)userInfo
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setUserInfo:userInfo resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addUserExtraInfo, withExtraInfo:(NSDictionary*)extraInfo
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addUserExtraInfo:extraInfo resolve:resolve reject:reject];
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

RCT_REMAP_METHOD(sendTelemetryLog, withMessage:(NSString*)message
                 withAttributes: (NSDictionary *)attributes
                 withConfig:(NSDictionary *)config
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self sendTelemetryLog:message attributes:attributes config:config resolve:resolve reject:reject];
}

- (instancetype)init {
  self = [super init];
  if (self) {
      RCTExecuteOnMainQueue(^{
          RCTRegisterReloadCommandListener(self);
      });
  }
  return self;
}

- (DdSdkImplementation*)ddSdkImplementation
{
    if (_ddSdkImplementation == nil) {
        _ddSdkImplementation = [[DdSdkImplementation alloc] initWithBridge:_bridge];
#ifdef RCT_NEW_ARCH_ENABLED
        [self registerSessionIdListener];
#endif
    }
    return _ddSdkImplementation;
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

- (void)setUserInfo:(NSDictionary *)userInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setUserInfoWithUserInfo:userInfo resolve:resolve reject:reject];
}

-(void)addUserExtraInfo:(NSDictionary *)extraInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation addUserExtraInfoWithExtraInfo:extraInfo resolve:resolve reject:reject];
}

- (void)sendTelemetryLog:(NSString *)message attributes:(NSDictionary *)attributes config:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation sendTelemetryLogWithMessage:message attributes:attributes config:config resolve:resolve reject:reject];
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

- (void)addListener:(NSString *)eventType {
    [DdSdkSessionStartedListener.instance setHasListeners: true];
    [super addListener:eventType];
}

- (void)removeListeners:(double)count {
    [DdSdkSessionStartedListener.instance setHasListeners: false];
    [super removeListeners:count];
}

- (NSArray<NSString *> *)supportedEvents {
    return [[NSArray alloc] initWithObjects:@"RUMSessionStarted", nil];
}

- (void)startObserving {
    [DdSdkSessionStartedListener.instance setHasListeners: true];
}

- (void)stopObserving {
    [DdSdkSessionStartedListener.instance setHasListeners: false];
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

- (void)didReceiveReloadCommand {
    [DdSdkSessionStartedListener invalidate];
}

+ (RCTBridge *)latestBridgeReference {
    return _bridge;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdSdkSpecJSI>(params);
}

- (void)registerSessionIdListener {
    __weak DdSdk* weakSelf = self;
    [DdSdkSessionStartedListener.instance setListenerCallback:^(NSString * _Nonnull sessionId) {
        DdSdk* strongSelf = weakSelf;
        if (!strongSelf) {
            return;
        }

        [strongSelf sendEventWithName:@"RUMSessionStarted" body: sessionId];
    }];
}

#else
- (void)registerNativeBridge {
    [DdSdkSessionStartedListener.instance setRCTBridge: _bridge];
}
#endif

- (void)setBridge:(RCTBridge *)bridge {
    [super setBridge:bridge];
    _bridge = bridge;
    #ifndef RCT_NEW_ARCH_ENABLED
    [self registerNativeBridge];
    #endif
}

@end
