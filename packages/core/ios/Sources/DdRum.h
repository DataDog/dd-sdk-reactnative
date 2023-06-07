#import <Foundation/Foundation.h>
@class DdRumImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdRum: NSObject <NativeDdRumSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdRum : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdRumImplementation* ddRumImplementation;

@end
