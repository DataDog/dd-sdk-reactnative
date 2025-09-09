//
//  DatadogWebViewLegacy.mm
//  Pods
//
//  Created by Marco Saia on 08.09.25.
//

#if __has_include("DatadogSDKReactNativeWebView-Swift.h")
#import <DatadogSDKReactNativeWebView-Swift.h>
#else
#import <DatadogSDKReactNativeWebView/DatadogSDKReactNativeWebView-Swift.h>
#endif
#import "DatadogWebViewLegacy.h"

@interface DatadogWebViewLegacy ()
@property(nonatomic, strong) DatadogWebViewLegacyImplementation* _Nonnull datadogWebViewLegacyImplementation;
@end

@implementation DatadogWebViewLegacy

RCT_EXPORT_MODULE(DdWebViewLegacy)

RCT_REMAP_METHOD(consumeWebviewEvent, withWebviewMessage:(NSString*)message
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
    [self consumeWebviewEvent:message resolve:resolve reject:reject];
}


- (void)consumeWebviewEvent:(NSString *)message resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [self.datadogWebViewLegacyImplementation consumeWebviewEventWithMessage:message resolve:resolve reject:reject];
}

- (DatadogWebViewLegacyImplementation*)datadogWebViewLegacyImplementation
{
    if (_datadogWebViewLegacyImplementation == nil) {
        _datadogWebViewLegacyImplementation = [[DatadogWebViewLegacyImplementation alloc] init];
    }
    return _datadogWebViewLegacyImplementation;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDdWebViewLegacySpecJSI>(params);
}
#endif

@end
