/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
@_spi(Internal)
import DatadogSessionReplay
import DatadogInternal
import DatadogSDKReactNative
import UIKit
import React


internal struct ReactNativeSVGResource: SessionReplayResource {
    let identifier: String
    let svgContent: String
    let mimeType: String = "image/svg+xml"

    init(id: String, svgContent: String) {
        self.identifier = id
        self.svgContent = svgContent
    }

    func calculateIdentifier() -> String {
        return identifier
    }

    func calculateData() -> Data {
        return svgContent.data(using: .utf8) ?? Data()
    }
}


internal class SvgViewRecorder: SessionReplayNodeRecorder {
    internal var identifier = UUID()

    internal let uiManager: RCTUIManager
    internal let fabricWrapper: RCTFabricWrapper
    internal let svgMap: [String: SVGData]

    internal init(uiManager: RCTUIManager, fabricWrapper: RCTFabricWrapper, svgMap: [String: SVGData]) {
        self.uiManager = uiManager
        self.fabricWrapper = fabricWrapper
        self.svgMap = svgMap
    }
    
    func semantics(
        of view: UIView,
        with attributes: SessionReplayViewAttributes,
        in context: SessionReplayViewTreeRecordingContext
    ) -> SessionReplayNodeSemantics? {
        
        if (view.accessibilityIdentifier != nil) {
            let viewId = context.ids.nodeID(view: view, nodeRecorder: self)
            let subView = view.subviews[0]
            
            if let attrs = view.value(forKey: "attributes") as? [String: String] {
                let svgId = context.ids.nodeID(view: subView, nodeRecorder: self)
                let type = attrs["type"]
                
                guard let hash = attrs["hash"] else {
                    return nil
                }
                
                if (type != "svg") {
                    return nil
                }
                
                let bundle = Bundle(for: SvgViewRecorder.self)
                if let url = bundle.url(forResource: "assets", withExtension: "bin") {
                    do {
                        let data = try Data(contentsOf: url)
                        guard let svgInfo = svgMap[hash] else {
                            return nil
                        }
                        
                        let range = svgInfo.offset..<(svgInfo.offset + svgInfo.length)
                        let svgData = String(data: data.subdata(in: range), encoding: .utf8)
                        
                        let svgResource = ReactNativeSVGResource(
                             id: hash,
                             svgContent: svgData!
                         )

                        let contentFrame = CGRect(
                            origin: attributes.frame.origin,
                            size: CGSize(width: subView.bounds.width,
                                         height: subView.bounds.height)
                        )
                        
                        let builder = SvgViewWireframesBuilder(
                            wireframeID: viewId,
                            imageWireframeID: svgId,
                            attributes: attributes,
                            contentFrame: contentFrame,
                            svgResource: svgResource,
                            imagePrivacyLevel: context.recorder.imagePrivacy
                        )
                        
                        let element = SessionReplaySpecificElement(subtreeStrategy: .ignore, nodes: [
                            SessionReplayNode(viewAttributes: attributes, wireframesBuilder: builder)
                        ])
                        
                        return element
                    } catch {
                        return nil
                    }
                }
            }
        }

        return nil
    }
}

internal struct SvgViewWireframesBuilder: SessionReplayNodeWireframesBuilder {
    let wireframeID: WireframeID
    
    var wireframeRect: CGRect {
        attributes.frame
    }
    
    let imageWireframeID: WireframeID
    
    let attributes: SessionReplayViewAttributes
    
    let contentFrame: CGRect?
    
    let svgResource: ReactNativeSVGResource?
    
    let imagePrivacyLevel: ImagePrivacyLevel
    
    func buildWireframes(with builder: SessionReplayWireframesBuilder) -> [SRWireframe] {
        var wireframes = [
            builder.createShapeWireframe(
                id: wireframeID,
                frame: attributes.frame,
                clip: attributes.clip,
                borderColor: attributes.layerBorderColor,
                borderWidth: attributes.layerBorderWidth,
                backgroundColor: attributes.backgroundColor,
                cornerRadius: attributes.layerCornerRadius,
                opacity: attributes.alpha
            )
        ]
        
        if let svgResource {
            wireframes.append(
                builder.createImageWireframe(
                    id: imageWireframeID,
                    resource: svgResource,
                    frame: contentFrame ?? attributes.frame,
                    clip: attributes.clip
                )
            )
        }

        return wireframes
    }
}
