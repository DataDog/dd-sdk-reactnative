import DatadogSessionReplay

enum DdTextPrivacy: String {
    case MASK_SENSITIVE_INPUTS
    case MASK_ALL_INPUTS
    case MASK_ALL

    var toPrivacyLevel: TextAndInputPrivacyLevel {
        switch self {
        case .MASK_SENSITIVE_INPUTS: return .maskSensitiveInputs
        case .MASK_ALL_INPUTS: return .maskAllInputs
        case .MASK_ALL: return .maskAll
        }
    }
}

enum DdImagePrivacy: String {
    case MASK_NONE
    case MASK_NON_BUNDLED_ONLY
    case MASK_ALL

    var toPrivacyLevel: ImagePrivacyLevel {
        switch self {
        case .MASK_NONE: return .maskNone
        case .MASK_NON_BUNDLED_ONLY: return .maskNonBundledOnly
        case .MASK_ALL: return .maskAll
        }
    }
}

enum DdTouchPrivacy: String {
    case SHOW
    case HIDE

    var toPrivacyLevel: TouchPrivacyLevel {
        switch self {
        case .SHOW: return .show
        case .HIDE: return .hide
        }
    }
}
