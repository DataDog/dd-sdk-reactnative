/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import Foundation
@_spi(Internal) import DatadogCore
import DatadogFlags

@objc(FlagsExperimentSupport)
public final class FlagsExperimentSupport: NSObject {
    static let mode = ProcessInfo.processInfo.environment["DD_FLAGS_EXPERIMENT"] ?? ""
    private static var initialization: [String: Any] = [:]

    static func prepare() {
        #if targetEnvironment(simulator)
        guard ["none", "bridge-only", "exposures", "evaluations", "both"].contains(mode) else { return }
        guard let rawPort = ProcessInfo.processInfo.environment["DD_FLAGS_SINK_PORT"],
              let port = UInt16(rawPort), port > 0 else { return }
        let endpoint = "http://127.0.0.1:\(port)"
        let core = Datadog.initialize(
            with: Datadog.Configuration(clientToken: "synthetic-benchmark-only", env: "benchmark",
                                       batchSize: .small, uploadFrequency: .frequent),
            trackingConsent: .granted
        )
        Flags.enable(with: .init(
            customFlagsEndpoint: URL(string: "\(endpoint)/config"),
            customExposureEndpoint: URL(string: "\(endpoint)/exposures"),
            trackExposures: mode == "exposures" || mode == "both",
            customEvaluationEndpoint: URL(string: "\(endpoint)/evaluations"),
            trackEvaluations: mode == "evaluations" || mode == "both",
            evaluationFlushInterval: 1,
            rumIntegrationEnabled: false
        ))
        Datadog.clearAllData()
        initialization = [
            "coreType": String(describing: type(of: core)),
            "clientType": String(describing: type(of: FlagsClient.create(name: "benchmark-preflight"))),
        ]
        #endif
    }

    @objc public static func settings() -> [String: Any] { ["mode": mode, "initialization": initialization] }

    @objc public static func snapshot() -> [String: Any] {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<integer_t>.size)
        let status = withUnsafeMutablePointer(to: &info) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
            }
        }
        return [
            "residentBytes": status == KERN_SUCCESS ? NSNumber(value: info.resident_size) : NSNull(),
            "thermalState": ProcessInfo.processInfo.thermalState.rawValue,
        ]
    }

    @objc public static func flush() -> [String: Any] {
        Datadog.flush()
        var result = snapshot()
        result["initialization"] = initialization
        result["bridgeClientType"] = String(describing: type(of: FlagsClient.shared(named: "benchmark-0-repeated-0")))
        return result
    }
}
