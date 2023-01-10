/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2021 Datadog, Inc.
 */

import Foundation
import Datadog

internal func logEventMapper(event: LogEvent) -> LogEvent {
    var log = event

    if let extraUserInfo = log.attributes.userAttributes.removeValue(forKey: "_dd.extraUserInfo") as? [String: Encodable] {
        log.userInfo.extraInfo = extraUserInfo
    }

    return log
}
