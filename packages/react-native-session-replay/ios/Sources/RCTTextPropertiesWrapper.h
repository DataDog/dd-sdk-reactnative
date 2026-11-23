/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <UIKit/UIKit.h>

@interface RCTTextPropertiesWrapper : NSObject

extern NSString* const RCTTextPropertiesDefaultText;
extern NSTextAlignment const RCTTextPropertiesDefaultAlignment;
extern UIColor* const RCTTextPropertiesDefaultForegroundColor;
extern CGFloat const RCTTextPropertiesDefaultFontSize;
extern CGRect const RCTTextPropertiesDefaultContentRect;

@property (nonatomic, strong, nonnull) NSString* text;
@property (nonatomic, assign) NSTextAlignment alignment;
@property (nonatomic, strong, nonnull) UIColor* foregroundColor;
@property (nonatomic, assign) CGFloat fontSize;
@property (nonatomic, assign) CGRect contentRect;

- (instancetype _Nonnull) init;

@end
