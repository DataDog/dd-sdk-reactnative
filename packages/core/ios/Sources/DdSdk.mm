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

RCT_EXPORT_METHOD(addAttribute:(NSString*) key
                  withValue:(NSDictionary*) value
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addAttribute:key value:value resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(removeAttribute:(NSString*) key
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self removeAttribute:key resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addAttributes, withAttributes:(NSDictionary*)attributes
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addAttributes:attributes resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(removeAttributes, withKeys:(NSArray *)keys
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self removeAttributes:keys resolve:resolve reject:reject];
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

RCT_EXPORT_METHOD(clearUserInfo:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self clearUserInfo:resolve reject:reject];
}

RCT_REMAP_METHOD(setAccountInfo, withAccountInfo:(NSDictionary*)accountInfo
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setAccountInfo:accountInfo resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(addAccountExtraInfo, withAccountExtraInfo:(NSDictionary*)extraInfo
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self addAccountExtraInfo:extraInfo resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(clearAccountInfo:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self clearAccountInfo:resolve reject:reject];
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

RCT_EXPORT_METHOD(clearAllData:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self clearAllData:resolve reject:reject];
}

RCT_REMAP_METHOD(configurationFromString, configurationFromStringWithWire:(NSString*)wire
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self configurationFromString:wire resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(configurationToString, configurationToStringWithConfiguration:(NSDictionary*)configuration
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self configurationToString:configuration resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(fetchRulesConfiguration, fetchRulesConfigurationWithOptions:(NSDictionary*)options
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self fetchRulesConfiguration:options resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(fetchPrecomputedConfiguration, fetchPrecomputedConfigurationWithOptions:(NSDictionary*)options
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self fetchPrecomputedConfiguration:options resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(saveConfiguration, saveConfigurationWithConfiguration:(NSDictionary*)configuration
                 options:(NSDictionary*)options
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self saveConfiguration:configuration options:options resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(loadConfiguration, loadConfigurationWithOptions:(NSDictionary*)options
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self loadConfiguration:options resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setConfiguration, setNativeFlagsConfiguration:(NSDictionary*)configuration
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setConfiguration:configuration resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setEvaluationContext, setNativeFlagsEvaluationContext:(NSDictionary*)context
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self setEvaluationContext:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(resolveBooleanEvaluation, resolveBooleanEvaluationWithFlagKey:(NSString*)flagKey
                 defaultValue:(BOOL)defaultValue
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self resolveBooleanEvaluation:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(resolveStringEvaluation, resolveStringEvaluationWithFlagKey:(NSString*)flagKey
                 defaultValue:(NSString*)defaultValue
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self resolveStringEvaluation:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(resolveNumberEvaluation, resolveNumberEvaluationWithFlagKey:(NSString*)flagKey
                 defaultValue:(double)defaultValue
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self resolveNumberEvaluation:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(resolveObjectEvaluation, resolveObjectEvaluationWithFlagKey:(NSString*)flagKey
                 defaultValue:(NSDictionary*)defaultValue
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self resolveObjectEvaluation:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

RCT_EXPORT_METHOD(getProviderDebugState:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self getProviderDebugState:resolve reject:reject];
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

#if TARGET_OS_IOS
- (void)consumeWebviewEvent:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation consumeWebviewEventWithMessage:message resolve:resolve reject:reject];
}
#endif

- (void)initialize:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation initializeWithConfiguration:configuration resolve:resolve reject:reject];
}

- (void)addAttribute:(NSString *)key value:(NSDictionary *)value resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation addAttributeWithKey:key value:value resolve:resolve reject:reject];
}

- (void)removeAttribute:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation removeAttributeWithKey:key resolve:resolve reject:reject];
}

- (void)addAttributes:(NSDictionary *)attributes resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation addAttributesWithAttributes:attributes resolve:resolve reject:reject];
}

- (void)removeAttributes:(NSArray *)keys resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation removeAttributesWithKeys:keys resolve:resolve reject:reject];
}

- (void)setTrackingConsent:(NSString *)trackingConsent resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setTrackingConsentWithTrackingConsent:trackingConsent resolve:resolve reject:reject];
}

- (void)setUserInfo:(NSDictionary *)userInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setUserInfoWithUserInfo:userInfo resolve:resolve reject:reject];
}

- (void)clearUserInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation clearUserInfoWithResolve:resolve reject:reject];
}

-(void)addUserExtraInfo:(NSDictionary *)extraInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation addUserExtraInfoWithExtraInfo:extraInfo resolve:resolve reject:reject];
}

- (void)setAccountInfo:(NSDictionary *)accountInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setAccountInfoWithAccountInfo:accountInfo resolve:resolve reject:reject];
}

- (void)clearAccountInfo:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation clearAccountInfoWithResolve:resolve reject:reject];
}

-(void)addAccountExtraInfo:(NSDictionary *)extraInfo resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation addAccountExtraInfoWithExtraInfo:extraInfo resolve:resolve reject:reject];
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

- (void)configurationFromString:(NSString *)wire resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation configurationFromStringWithWire:wire resolve:resolve reject:reject];
}

- (void)configurationToString:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation configurationToStringWithConfiguration:configuration resolve:resolve reject:reject];
}

- (void)fetchRulesConfiguration:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation fetchRulesConfigurationWithOptions:options resolve:resolve reject:reject];
}

- (void)fetchPrecomputedConfiguration:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation fetchPrecomputedConfigurationWithOptions:options resolve:resolve reject:reject];
}

- (void)saveConfiguration:(NSDictionary *)configuration options:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation saveConfigurationWithConfiguration:configuration options:options resolve:resolve reject:reject];
}

- (void)loadConfiguration:(NSDictionary *)options resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation loadConfigurationWithOptions:options resolve:resolve reject:reject];
}

- (void)setConfiguration:(NSDictionary *)configuration resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setConfigurationWithConfiguration:configuration resolve:resolve reject:reject];
}

- (void)setEvaluationContext:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation setEvaluationContextWithContext:context resolve:resolve reject:reject];
}

- (void)resolveBooleanEvaluation:(NSString *)flagKey defaultValue:(BOOL)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation resolveBooleanEvaluationWithFlagKey:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)resolveStringEvaluation:(NSString *)flagKey defaultValue:(NSString *)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation resolveStringEvaluationWithFlagKey:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)resolveNumberEvaluation:(NSString *)flagKey defaultValue:(double)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation resolveNumberEvaluationWithFlagKey:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)resolveObjectEvaluation:(NSString *)flagKey defaultValue:(NSDictionary *)defaultValue resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation resolveObjectEvaluationWithFlagKey:flagKey defaultValue:defaultValue resolve:resolve reject:reject];
}

- (void)getProviderDebugState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.ddSdkImplementation getProviderDebugStateWithResolve:resolve reject:reject];
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
