/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React
import UIKit

internal extension UIWindow {
    /// Returns the React Native root view in the current app's key window, if any.
    static func reactRootView() -> UIView? {
        return UIApplication.shared.activeKeyWindow?.findReactRootView()
    }

    private func findReactRootView() -> UIView? {
        return findReactRootView(in: self)
    }

    private func findReactRootView(in view: UIView) -> UIView? {
        if view.isReactRootView() {
            return view
        }
        for subview in view.subviews {
            if let root = findReactRootView(in: subview) {
                return root
            }
        }
        return nil
    }
}

private extension UIApplication {
    var activeKeyWindow: UIWindow? {
        if #available(iOS 13.0, *) {
            let activeScene = connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first(where: { $0.activationState == .foregroundActive })
            if #available(iOS 15.0, *) {
                return activeScene?.keyWindow
            }
            return activeScene?.windows.first(where: { $0.isKeyWindow })
        } else {
            return windows.first(where: { $0.isKeyWindow })
        }
    }
}

internal extension RCTUIManager {
    /// Returns the view for a given `reactTag`, with a hit-test fallback when the tag cannot be resolved.
    ///
    /// Tries `view(forReactTag:)` first (fast path). If it returns `nil`, falls back to a hit-test
    /// on the RN root view using `pageLocation` and overwrites `location` with the tap point in
    /// the hit-tested view's coordinate space. This hardens the integration against RN potentially
    /// deprecating `reactTag` view lookup on Fabric.
    ///
    /// - Parameters:
    ///   - reactTag: The reactTag reported by the JS `GestureResponderEvent`.
    ///   - location: On input, the tap location in the original target view's coordinate space
    ///     (from `locationX/Y`). On output, the tap location in the resolved view's coordinate
    ///     space — unchanged on the fast path, recomputed when the fallback is used.
    ///   - pageLocation: The tap location in the RN root view's coordinate space (from `pageX/Y`).
    ///     RN computes these by converting the touch point from window to root-view coordinates,
    ///     so no additional conversion is needed before hit-testing.
    ///   - rootViewProvider: Closure returning the RN root view to hit-test against.
    func view(
        forReactTag reactTag: NSNumber,
        location: inout CGPoint,
        pageLocation: CGPoint,
        rootViewProvider: () -> UIView?
    ) -> UIView? {
        if let view = view(forReactTag: reactTag) {
            return view
        }
        DdTelemetry.telemetryDebug(
            id: "datadog_react_native:heatmap_fallback",
            message: "Heatmap view resolution fell back to hit-test"
        )
        guard
            let rootView = rootViewProvider(),
            let hitView = rootView.hitTest(pageLocation, with: nil)
        else {
            return nil
        }
        location = rootView.convert(pageLocation, to: hitView)
        return hitView
    }
}
