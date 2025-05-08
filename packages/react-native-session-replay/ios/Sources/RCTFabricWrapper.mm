/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "RCTFabricWrapper.h"

#if RCT_NEW_ARCH_ENABLED
#import "RCTVersion.h"

#import <React-RCTFabric/React/RCTParagraphComponentView.h>
#import <React-RCTFabric/React/RCTConversions.h>

#if __has_include(<React-FabricComponents/react/renderer/components/text/ParagraphProps.h>)
#import <React-FabricComponents/react/renderer/components/text/ParagraphProps.h>
#else
#import <React-Fabric/react/renderer/components/text/ParagraphProps.h>
#endif

namespace rct = facebook::react;
#endif

@implementation RCTFabricWrapper
/**
 * Extracts the text properties from the given UIView when the view is of type RCTParagraphComponentView, returns nil otherwise.
 */
- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView *)view {
    #if RCT_NEW_ARCH_ENABLED
    if (![view isKindOfClass:[RCTParagraphComponentView class]]) {
        return nil;
    }

    // Cast view to RCTParagraphComponentView
    RCTParagraphComponentView* paragraphComponentView = (RCTParagraphComponentView *)view;
    if (paragraphComponentView == nil) {
        return nil;
    }

    // Retrieve ParagraphProps from shared pointer
    const rct::ParagraphProps* props = (rct::ParagraphProps*)paragraphComponentView.props.get();
    if (props == nil) {
        return nil;
    }

    // Extract Attributes
    RCTTextPropertiesWrapper* textPropertiesWrapper = [[RCTTextPropertiesWrapper alloc] init];
    textPropertiesWrapper.text = [RCTFabricWrapper getTextFromView:paragraphComponentView];
    textPropertiesWrapper.contentRect = paragraphComponentView.bounds;

    rct::TextAttributes textAttributes = props->textAttributes;
    textPropertiesWrapper.alignment = [RCTFabricWrapper getAlignmentFromAttributes:textAttributes];
    textPropertiesWrapper.foregroundColor = [RCTFabricWrapper getForegroundColorFromAttributes:textAttributes];
    textPropertiesWrapper.fontSize = [RCTFabricWrapper getFontSizeFromAttributes:textAttributes];

    return textPropertiesWrapper;
    #else
    return nil;
    #endif
}

#if RCT_NEW_ARCH_ENABLED
+ (NSString* _Nonnull)getTextFromView:(RCTParagraphComponentView*)view {
    if (view == nil || view.attributedText == nil) {
        return RCTTextPropertiesDefaultText;
    }

    return view.attributedText.string;
}

+ (NSTextAlignment)getAlignmentFromAttributes:(rct::TextAttributes)textAttributes {
    const rct::TextAlignment alignment = textAttributes.alignment.has_value() ?
        textAttributes.alignment.value() :
        rct::TextAlignment::Natural;

    switch (alignment) {
        case rct::TextAlignment::Natural:
            return NSTextAlignmentNatural;

        case rct::TextAlignment::Left:
            return NSTextAlignmentLeft;

        case rct::TextAlignment::Center:
            return NSTextAlignmentCenter;

        case rct::TextAlignment::Right:
            return NSTextAlignmentRight;

        case rct::TextAlignment::Justified:
            return NSTextAlignmentJustified;

        default:
            return RCTTextPropertiesDefaultAlignment;
    }
}

+ (UIColor* _Nonnull)getForegroundColorFromAttributes:(rct::TextAttributes)textAttributes {
    @try {
#if RCT_VERSION_MINOR > 73
        rct::Color color = *textAttributes.foregroundColor;
        UIColor* uiColor = (__bridge UIColor*)color.getUIColor().get();
        if (uiColor != nil) {
            return uiColor;
        }
#else
        return RCTUIColorFromSharedColor(textAttributes.foregroundColor);
#endif
    } @catch (NSException *exception) {}

    return RCTTextPropertiesDefaultForegroundColor;
}

+ (CGFloat)getFontSizeFromAttributes:(rct::TextAttributes)textAttributes {
    // Float is just an alias for CGFloat, but this could change in the future.
    _Static_assert(sizeof(rct::Float) == sizeof(CGFloat), "Float and CGFloat are expected to have the same size.");
    return isnan(textAttributes.fontSize) ? RCTTextPropertiesDefaultFontSize : (CGFloat)textAttributes.fontSize;
}
#endif
@end
