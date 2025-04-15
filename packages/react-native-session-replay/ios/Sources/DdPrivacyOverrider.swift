import ObjectiveC
import UIKit
@_spi(objc) import DatadogSessionReplay

@objc public class DdPrivacyOverrider: NSObject {
    @objc public static func setOverrides(
        for view: UIView,
        textPrivacy: NSString?,
        imagePrivacy: NSString?,
        touchPrivacy: NSString?,
        hide: Bool
    ) {
        let wrapper = objc_SessionReplayPrivacyOverrides(view: view)

        if let raw = textPrivacy as String?,
           let val = mapTextPrivacy(raw)
        {
            wrapper.textAndInputPrivacy = val
        }

        if let raw = imagePrivacy as String?,
           let val = mapImagePrivacy(raw)
        {
            wrapper.imagePrivacy = val
        }

        if let raw = touchPrivacy as String?,
           let val = mapTouchPrivacy(raw)
        {
            wrapper.touchPrivacy = val
        }

        wrapper.hide = NSNumber(value: hide)
    }

    private static func mapTextPrivacy(_ string: String) -> objc_TextAndInputPrivacyLevelOverride? {
        switch string.uppercased() {
        case "MASK_SENSITIVE_INPUTS": return .maskSensitiveInputs
        case "MASK_ALL_INPUTS": return .maskAllInputs
        case "MASK_ALL": return .maskAll
        default: return objc_TextAndInputPrivacyLevelOverride.none
        }
    }

    private static func mapImagePrivacy(_ string: String) -> objc_ImagePrivacyLevelOverride? {
        switch string.uppercased() {
        case "MASK_NONE": return .maskNone
        case "MASK_NON_BUNDLED_ONLY": return .maskNonBundledOnly
        case "MASK_ALL": return .maskAll
        default: return objc_ImagePrivacyLevelOverride.none
        }
    }

    private static func mapTouchPrivacy(_ string: String) -> objc_TouchPrivacyLevelOverride? {
        switch string.uppercased() {
        case "SHOW": return .show
        case "HIDE": return .hide
        default: return objc_TouchPrivacyLevelOverride.none
        }
    }

    @objc public static func debugPrint(for view: UIView) {
        let wrapper = objc_SessionReplayPrivacyOverrides(view: view)
        print("""
        - text: \(wrapper.textAndInputPrivacy)
        - image: \(wrapper.imagePrivacy)
        - touch: \(wrapper.touchPrivacy)
        - hide: \(String(describing: wrapper.hide))
        """)
    }
}
