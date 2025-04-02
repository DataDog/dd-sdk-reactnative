import Foundation
import UIKit
@_spi(Internal) import DatadogSessionReplay

@objc(DdView)
public class DdView: UIView {
    
    @objc public var textAndInputPrivacy: String? = nil {
        didSet {
            if let val = DdTextPrivacy(rawValue: textAndInputPrivacy!)?.toPrivacyLevel {
                dd.sessionReplayPrivacyOverrides.textAndInputPrivacy = val
                print("Val input: \(val)")
            }
        }
    }
    
    @objc public var imagePrivacy: String? = nil {
        didSet {
            if let val = DdImagePrivacy(rawValue: imagePrivacy!)?.toPrivacyLevel {
                dd.sessionReplayPrivacyOverrides.imagePrivacy = val
                print("Val image: \(val)")
            }
        }
    }
    
    @objc public var touchPrivacy: String? = nil {
        didSet {
            if let val = DdTouchPrivacy(rawValue: touchPrivacy!)?.toPrivacyLevel {
                dd.sessionReplayPrivacyOverrides.touchPrivacy = val
            }
        }
    }
    
    @objc public var hide: Bool = false {
        didSet {
//            print("hide set to: \(hide)")
//            dd.sessionReplayPrivacyOverrides.hide = hide
        }
    }
    
    
    @objc override public init(frame: CGRect) {
        super.init(frame: frame)
    }

    @objc required public init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    @objc public func debugPrintOverrides() {
        let overrides = dd.sessionReplayPrivacyOverrides
        print("""
        [DdView debug]
        textAndInputPrivacy: \(String(describing: overrides.textAndInputPrivacy))
        imagePrivacy: \(String(describing: overrides.imagePrivacy))
        touchPrivacy: \(String(describing: overrides.touchPrivacy))
        hide: \(String(describing: overrides.hide))
        """)
    }
}
