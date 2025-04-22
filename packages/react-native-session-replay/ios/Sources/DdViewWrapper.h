/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface DdViewWrapper : UIView

@property (nonatomic, strong) NSString *textPrivacy;
@property (nonatomic, strong) NSString *imagePrivacy;
@property (nonatomic, strong) NSString *touchPrivacy;
@property (nonatomic, assign) BOOL hide;

@end

NS_ASSUME_NONNULL_END
