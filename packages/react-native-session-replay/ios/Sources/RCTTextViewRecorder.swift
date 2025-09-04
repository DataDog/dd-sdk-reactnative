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
    internal var textObfuscator: (SessionReplayViewTreeRecordingContext, SessionReplayViewAttributes) -> SessionReplayTextObfuscating = { context, viewAttributes in
        return viewAttributes.resolveTextAndInputPrivacyLevel(in: context).staticTextObfuscator
    }

    internal var identifier = UUID()

    internal let uiManager: RCTUIManager
    internal let fabricWrapper: RCTFabricWrapper

    internal init(uiManager: RCTUIManager, fabricWrapper: RCTFabricWrapper) {
        self.uiManager = uiManager
        self.fabricWrapper = fabricWrapper
    }

    public func semantics(
        of view: UIView,
        with attributes: SessionReplayViewAttributes,
        in context: SessionReplayViewTreeRecordingContext
    ) -> SessionReplayNodeSemantics? {
        guard
            let textProperties = fabricWrapper.tryToExtractTextProperties(from: view) ?? tryToExtractTextProperties(view: view)
        else {
            return view is RCTTextView ? SessionReplayInvisibleElement.constant : nil
        }

        let builder = RCTTextViewWireframesBuilder(
            wireframeID: context.ids.nodeID(view: view, nodeRecorder: self),
            attributes: attributes,
            text: textProperties.text,
            textAlignment: textProperties.alignment,
            textColor: textProperties.foregroundColor,
            textObfuscator: textObfuscator(context, attributes),
            fontSize: textProperties.fontSize,
            contentRect: textProperties.contentRect
        )

        return SessionReplaySpecificElement(subtreeStrategy: .ignore, nodes: [
            SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
        ])
    }

    internal func tryToExtractTextFromSubViews(
        subviews: [RCTShadowView]?
    ) -> String? {
        guard let subviews = subviews else {
            return nil
        }

        return subviews.compactMap { subview in
            if let sub = subview as? RCTRawTextShadowView {
                return sub.text
            }
            if let sub = subview as? RCTVirtualTextShadowView {
                // We recursively get all subviews for nested Text components
                return tryToExtractTextFromSubViews(subviews: sub.reactSubviews())
            }
            return nil
        }.joined()
    }

    private func tryToExtractTextProperties(view: UIView) -> RCTTextPropertiesWrapper? {
        guard let textView = view as? RCTTextView else {
            return nil
        }

        var shadowView: RCTTextShadowView? = nil
        let tag = textView.reactTag

        let timeout: TimeInterval = 0.2
        let semaphore = DispatchSemaphore(value: 0)
        
        // We need to access the shadow view from the UIManager queue, but we're currently on the main thread.
        // Calling `.sync` from the main thread to the UIManager queue is unsafe, because the UIManager queue
        // may already be executing a layout operation that in turn requires the main thread (e.g. measuring a native view).
        // That would create a circular dependency and deadlock the app.
        // To avoid this, we dispatch the work asynchronously to the UIManager queue and wait with a timeout.
        // This ensures we block only if absolutely necessary, and can fail gracefully if the queue is busy.
        RCTGetUIManagerQueue().async {
            shadowView = self.uiManager.shadowView(forReactTag: tag) as? RCTTextShadowView
            semaphore.signal()
        }
        
        let waitResult = semaphore.wait(timeout: .now() + timeout)
        if waitResult == .timedOut {
            return nil
        }

        guard let shadow = shadowView else {
            return nil
        }

        let textProperties = RCTTextPropertiesWrapper()

        // TODO: RUM-2173 check performance is ok
        if let text = tryToExtractTextFromSubViews(subviews: shadow.reactSubviews()) {
            textProperties.text = text
        }

        if let foregroundColor = shadow.textAttributes.foregroundColor {
            textProperties.foregroundColor = foregroundColor
        }

        textProperties.alignment = shadow.textAttributes.alignment
        textProperties.fontSize = shadow.textAttributes.fontSize
        textProperties.contentRect = shadow.contentFrame

        return textProperties
    }
}

internal struct RCTTextViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    let attributes: SessionReplayViewAttributes
    let text: String
    var textAlignment: NSTextAlignment
    let textColor: UIColor
    let textObfuscator: SessionReplayTextObfuscating
    let fontSize: CGFloat
    let contentRect: CGRect

    public var wireframeRect: CGRect {
        attributes.frame
    }

    // Clipping should be 0 to avoid the text from overflowing when the
    // numberOfLines prop is used.
    // To apply clip(0 0 0 0) we set a negative clipping (which has no effect).
    // TODO: RUM-2354 remove this when clip(0 0 0 0) is applied 
    private var clip: SRContentClip {
        let top = -1.0 
        let left = 0.0
        let bottom = 0.0
        let right = 0.0
        return SRContentClip.create(
            bottom: Int64(withNoOverflow: bottom),
            left: Int64(withNoOverflow: left),
            right: Int64(withNoOverflow: right),
            top: Int64(withNoOverflow: top)
        )
    }

    private var relativeIntersectedRect: CGRect {
        return CGRect(
            x: attributes.frame.origin.x,
            y: attributes.frame.origin.y,
            width: max(contentRect.width, attributes.frame.width),
            height: max(contentRect.height, attributes.frame.height)
        )
    }

    private var textFrame: CGRect {
        return CGRect(
            x: attributes.frame.origin.x + contentRect.origin.x,
            y: attributes.frame.origin.y + contentRect.origin.y,
            width: contentRect.width,
            height: contentRect.height
        )
    }

    public func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [SRWireframe] {
        return [
            builder.createTextWireframe(
                id: wireframeID,
                frame: relativeIntersectedRect,
                clip: attributes.clip,
                text: textObfuscator.mask(text: text),
                textFrame: textFrame,
                // Text alignment is top for all RCTTextView and RCTParagraphComponentView components.
                textAlignment: .init(systemTextAlignment: textAlignment, vertical: .top),
                textColor: textColor.cgColor,
                fontOverride: SessionReplayWireframesBuilder.FontOverride(size: fontSize.isNaN ? RCTTextPropertiesDefaultFontSize : fontSize),
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
    }
}
