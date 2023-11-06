/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import UIKit
@_spi(Internal) import DatadogSessionReplay
import React

@_spi(Internal) public class RCTTextViewRecorder: CustomNodeRecorder {
    public let uiManager: RCTUIManager
    
    public init(uiManager: RCTUIManager) {
        self.uiManager = uiManager
        super.init()
    }
    
//    var textObfuscator: (ViewTreeRecordingContext, _ isSensitive: Bool) -> TextObfuscating = { context, isSensitive in
//        if isSensitive {
//            return context.recorder.privacy.sensitiveTextObfuscator
//        }
//
//        return context.recorder.privacy.staticTextObfuscator
//    }

    override public func getSessionReplayElement(
        view: UIView,
        attributes: SessionReplayViewAttributes,
        context: SessionReplayViewTreeRecordingContext
    ) -> SessionReplayElement? {
        guard let textView = view as? RCTTextView else {
            return nil
        }
 
        // guard let textContent = textView.textStorage().string else {
        //     return InvisibleElement.constant
        // }
        
        var shadowView: RCTTextShadowView? = nil
        let tag = textView.reactTag
    
        RCTGetUIManagerQueue().sync {
            shadowView = uiManager.shadowView(forReactTag: tag) as? RCTTextShadowView
        }

        if let shadow = shadowView {
            var relativeIntersectedRect: CGRect {
                // UITextView adds additional padding for presented content.
                let padding: CGFloat = 0
                return CGRect(
                    x: attributes.frame.origin.x - shadow.contentFrame.origin.x + padding,
                    y: attributes.frame.origin.y - shadow.contentFrame.origin.y + padding,
                    width: max(shadow.contentFrame.width, attributes.frame.width) - padding,
                    height: max(shadow.contentFrame.height, attributes.frame.height) - padding
                )
            }
            let top = abs(shadow.contentFrame.origin.y)
            let left = abs(shadow.contentFrame.origin.x)
            let bottom = max(shadow.contentFrame.height - attributes.frame.height - top, 0)
            let right = max(shadow.contentFrame.width - attributes.frame.width - left, 0)

            return .specificElement(subtreeStrategy: .ignore, attributes: attributes, builder: GenericTextWireframesBuilder(
                id: context.ids,
                frame: relativeIntersectedRect,
                text: textView.accessibilityLabel ?? "",
                textAlignment: GenericTextWireframesBuilder.TextAlignment(
                    textAlignment: shadow.textAttributes.alignment,
                    verticalTextAlignment: .top
                ),
                clip: .init(bottom: Int64(withNoOverflow: bottom), left: Int64(withNoOverflow: left), right: Int64(withNoOverflow: right), top: Int64(withNoOverflow: top)),
                textColor: shadow.textAttributes.foregroundColor?.cgColor,
                font: shadow.textAttributes.effectiveFont(),
                fontScalingEnabled: false,
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha,
                view: textView,
                nodeRecorder: self,
                wireframeRect: attributes.frame
            ))
        }

        return .invisibleElement
    }
}
