#import <Foundation/Foundation.h>
@class DdLogsImplementation;

#ifdef RCT_NEW_ARCH_ENABLED

#import <DdSdkReactNative/DdSdkReactNative.h>
@interface DdLogs: NSObject <NativeDdLogsSpec>

#else

#import <React/RCTBridgeModule.h>
@interface DdLogs : NSObject <RCTBridgeModule>

#endif

@property (nonatomic, strong) DdLogsImplementation* ddLogsImplementation;

@end
