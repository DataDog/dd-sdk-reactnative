#import <Foundation/Foundation.h>
@class DdTraceImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdTrace: NSObject <NativeDdTraceSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdTrace : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdTraceImplementation* ddTraceImplementation;

@end
