#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNQueueHolderProxy : NSObject

+ (dispatch_queue_t)getSharedQueue;

@end

NS_ASSUME_NONNULL_END
