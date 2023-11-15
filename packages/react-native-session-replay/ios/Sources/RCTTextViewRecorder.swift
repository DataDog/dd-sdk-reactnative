/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-Present Datadog, Inc.
 */

import UIKit
@_spi(Internal)
import DatadogSessionReplay
import React

internal class RCTTextViewRecorder: SessionReplayNodeRecorder {
    public var identifier = UUID()
    
    public let uiManager: RCTUIManager
    
    public init(uiManager: RCTUIManager) {
        self.uiManager = uiManager
    }
    
    internal func extractTextFromSubViews(
        subviews: [RCTShadowView]?
    ) -> String? {
        if let subviews = subviews {
            return subviews.compactMap { subview in
                if let sub = subview as? RCTRawTextShadowView {
                    return sub.text
                }
                if let sub = subview as? RCTVirtualTextShadowView {
                    // We recursively get all subviews for nested Text components
                    return extractTextFromSubViews(subviews: sub.reactSubviews())
                }
                return nil
            }.joined()
        }
        return nil
    }

    public func semantics(
        of view: UIView,
        with attributes: DatadogSessionReplay.SessionReplayViewAttributes,
        in context: DatadogSessionReplay.SessionReplayViewTreeRecordingContext
    ) -> DatadogSessionReplay.SessionReplayNodeSemantics? {
        guard let textView = view as? RCTTextView else {
            return nil
        }
        
        var shadowView: RCTTextShadowView? = nil
        let tag = textView.reactTag
    
        RCTGetUIManagerQueue().sync {
            shadowView = uiManager.shadowView(forReactTag: tag) as? RCTTextShadowView
        }

        if let shadow = shadowView {
            // TODO: RUM-2173 check performance is ok
            let text = extractTextFromSubViews(
                subviews: shadow.reactSubviews()
            )

            let builder = RCTTextViewWireframesBuilder(
                wireframeID: context.ids.nodeID(view: textView, nodeRecorder: self),
                attributes: attributes,
                text: text,
                textAlignment: shadow.textAttributes.alignment,
                textColor: shadow.textAttributes.foregroundColor?.cgColor,
                font: shadow.textAttributes.effectiveFont(), // Custom fonts are currently not supported for iOS
                contentRect: shadow.contentFrame
            )
            let node = SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
            return SessionReplaySpecificElement(subtreeStrategy: .record, nodes: [node])
        }
        return SessionReplayInvisibleElement.constant
    }
}

internal struct RCTTextViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    /// Attributes of the base `UIView`.
    let attributes: SessionReplayViewAttributes
    /// The text
    let text: String?
    /// The alignment of the text.
    var textAlignment: NSTextAlignment
    /// The color of the text.
    let textColor: CGColor?
    /// The font used by the text field.
    let font: UIFont?
    /// The frame of the text content
    let contentRect: CGRect

    public var wireframeRect: CGRect {
        attributes.frame
    }

    let DEFAULT_FONT_COLOR = UIColor.black.cgColor

    private var clip: SRContentClip {
        let top = abs(contentRect.origin.y)
        let left = abs(contentRect.origin.x)
        let bottom = max(contentRect.height - attributes.frame.height - top, 0)
        let right = max(contentRect.width - attributes.frame.width - left, 0)
        return SRContentClip.create(
            bottom: Int64(withNoOverflow: bottom),
            left: Int64(withNoOverflow: left),
            right: Int64(withNoOverflow: right),
            top: Int64(withNoOverflow: top)
        )
    }

    private var relativeIntersectedRect: CGRect {
        return CGRect(
            x: attributes.frame.origin.x - contentRect.origin.x,
            y: attributes.frame.origin.y - contentRect.origin.y ,
            width: max(contentRect.width, attributes.frame.width),
            height: max(contentRect.height, attributes.frame.height)
        )
    }

    public func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [SRWireframe] {
        return [
            builder.createTextWireframe(
                id: wireframeID,
                frame: relativeIntersectedRect,
                text: text ?? "",
                textAlignment: .init(systemTextAlignment: textAlignment, vertical: .center),
                clip: clip,
                textColor: textColor ?? DEFAULT_FONT_COLOR,
                font: font,
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
    }
}
