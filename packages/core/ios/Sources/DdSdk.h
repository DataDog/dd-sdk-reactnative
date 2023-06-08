#import <Foundation/Foundation.h>
@class DdSdkImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdSdk: NSObject <NativeDdSdkSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdSdk : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdSdkImplementation* ddSdkImplementation;

@end
