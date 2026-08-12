/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "RCTFabricWrapper.h"

#if RCT_NEW_ARCH_ENABLED
#import "RCTVersion.h"
#import "ParagraphProps.h"
#if RCT_VERSION_MINOR <= 73
#import "RCTConversions.h"
#endif

namespace rct = facebook::react;
#endif

@implementation RCTFabricWrapper
/**
 * Extracts the text properties from the given UIView when the view is of type RCTParagraphComponentView, returns nil otherwise.
 *
 * This deliberately avoids importing RCTParagraphComponentView.h / RCTComponentViewProtocol.h:
 * both live in the React-RCTFabric pod, which React Native's "prebuilt core" CocoaPods facade
 * (RN >= 0.87) ships without public headers, aside from a narrow allowlist that doesn't cover
 * either of them. The class and its `-props` accessor are resolved dynamically instead.
 */
- (nullable RCTTextPropertiesWrapper*)tryToExtractTextPropertiesFromView:(UIView *)view {
    #if RCT_NEW_ARCH_ENABLED
    Class paragraphComponentViewClass = NSClassFromString(@"RCTParagraphComponentView");
    if (paragraphComponentViewClass == nil || ![view isKindOfClass:paragraphComponentViewClass]) {
        return nil;
    }

    // `-props` is declared on RCTComponentViewProtocol (not on RCTParagraphComponentView
    // itself) and returns a C++ shared_ptr, so it can't be reached through KVC — look it up
    // and call it directly via its IMP instead of importing the protocol's header.
    SEL propsSelector = NSSelectorFromString(@"props");
    if (![view respondsToSelector:propsSelector]) {
        return nil;
    }
    typedef facebook::react::Props::Shared (*PropsIMP)(id, SEL);
    PropsIMP getProps = (PropsIMP)[view methodForSelector:propsSelector];
    if (getProps == NULL) {
        return nil;
    }
    facebook::react::Props::Shared sharedProps = getProps(view, propsSelector);
    const rct::ParagraphProps* props = (rct::ParagraphProps*)sharedProps.get();
    if (props == nil) {
        return nil;
    }

    // Extract Attributes
    RCTTextPropertiesWrapper* textPropertiesWrapper = [[RCTTextPropertiesWrapper alloc] init];
    textPropertiesWrapper.text = [RCTFabricWrapper getTextFromView:view];
    textPropertiesWrapper.contentRect = view.bounds;

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
+ (NSString* _Nonnull)getTextFromView:(UIView*)view {
    // `attributedText` is a plain Objective-C property on RCTParagraphComponentView, so it's
    // safe to read through KVC without importing that class's header (see the note above).
    NSAttributedString* attributedText = [view valueForKey:@"attributedText"];
    if (attributedText == nil) {
        return RCTTextPropertiesDefaultText;
    }

    return attributedText.string;
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
