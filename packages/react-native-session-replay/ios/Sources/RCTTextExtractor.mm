/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "RCTTextExtractor.h"

#if !RCT_NEW_ARCH_ENABLED
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#import <React/RCTTextView.h>
#import <React/RCTTextShadowView.h>
#import <React/RCTRawTextShadowView.h>
#import <React/RCTVirtualTextShadowView.h>
#endif

@implementation RCTTextExtractor

/**
 * Extracts the text properties from the given UIView when using the old Paper architecture.
 * Returns nil when using new architecture or if the view is not a RCTTextView.
 */
- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView *)view
                                                           withUIManager:(RCTUIManager *)uiManager {
#if !RCT_NEW_ARCH_ENABLED
    if (![view isKindOfClass:[RCTTextView class]]) {
        return nil;
    }

    RCTTextView* textView = (RCTTextView*)view;
    NSNumber* tag = textView.reactTag;

    __block RCTTextPropertiesWrapper* textProperties = nil;
    NSTimeInterval timeout = 0.2;
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

    // We need to access the shadow view from the UIManager queue, but we're currently on the main thread.
    // Calling `.sync` from the main thread to the UIManager queue is unsafe, because the UIManager queue
    // may already be executing a layout operation that in turn requires the main thread (e.g. measuring a native view).
    // That would create a circular dependency and deadlock the app.
    // To avoid this, we dispatch the work asynchronously to the UIManager queue and wait with a timeout.
    // This ensures we block only if absolutely necessary, and can fail gracefully if the queue is busy.
    //
    // All shadow view property reads (reactSubviews, textAttributes, layoutMetrics) must also happen
    // on the UIManager queue. The UIManager queue can mutate or deallocate shadow views and their
    // subviews at any time, so reading them on the main thread after the semaphore is signaled creates
    // a race condition that causes SIGSEGV crashes in objc_msgSend.
    dispatch_async(uiManager.methodQueue, ^{
        RCTTextShadowView* shadowView = (RCTTextShadowView*)[uiManager shadowViewForReactTag:tag];

        if (shadowView != nil && [shadowView isKindOfClass:[RCTTextShadowView class]]) {
            RCTTextPropertiesWrapper* wrapper = [[RCTTextPropertiesWrapper alloc] init];

            NSString* text = [self tryToExtractTextFromSubViews:shadowView.reactSubviews];
            if (text != nil) {
                wrapper.text = text;
            }

            if (shadowView.textAttributes.foregroundColor != nil) {
                wrapper.foregroundColor = shadowView.textAttributes.foregroundColor;
            }

            wrapper.alignment = shadowView.textAttributes.alignment;
            wrapper.fontSize = shadowView.textAttributes.fontSize;
            wrapper.contentRect = shadowView.layoutMetrics.contentFrame;

            textProperties = wrapper;
        }

        dispatch_semaphore_signal(semaphore);
    });

    dispatch_time_t waitTimeout = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeout * NSEC_PER_SEC));
    long waitResult = dispatch_semaphore_wait(semaphore, waitTimeout);

    if (waitResult != 0) { // timeout
        return nil;
    }

    return textProperties;
#else
    return nil;
#endif
}

#if !RCT_NEW_ARCH_ENABLED
- (nullable NSString*)tryToExtractTextFromSubViews:(NSArray<RCTShadowView*>*)subviews {
    if (subviews == nil) {
        return nil;
    }

    NSMutableArray<NSString*>* textParts = [NSMutableArray array];

    for (RCTShadowView* subview in subviews) {
        if ([subview isKindOfClass:[RCTRawTextShadowView class]]) {
            RCTRawTextShadowView* rawTextView = (RCTRawTextShadowView*)subview;
            if (rawTextView.text != nil) {
                [textParts addObject:rawTextView.text];
            }
        } else if ([subview isKindOfClass:[RCTVirtualTextShadowView class]]) {
            // We recursively get all subviews for nested Text components
            RCTVirtualTextShadowView* virtualTextView = (RCTVirtualTextShadowView*)subview;
            NSString* nestedText = [self tryToExtractTextFromSubViews:virtualTextView.reactSubviews];
            if (nestedText != nil) {
                [textParts addObject:nestedText];
            }
        }
    }

    if (textParts.count == 0) {
        return nil;
    }

    return [textParts componentsJoinedByString:@""];
}
#endif

/**
 * Checks if the given view is an RCTTextView.
 * Returns NO when using new architecture or if the view is not a RCTTextView.
 */
- (BOOL)isRCTTextView:(UIView *)view {
#if !RCT_NEW_ARCH_ENABLED
    return [view isKindOfClass:[RCTTextView class]];
#else
    return NO;
#endif
}

@end
