#import "RNQueueHolderProxy.h"
#import "DatadogSDKReactNative-Swift.h"

@implementation RNQueueHolderProxy

+ (dispatch_queue_t)getSharedQueue {
    return [RNQueue getSharedQueue];
}

@end
