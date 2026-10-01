/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

import Foundation
@_spi(Internal) import DatadogCore
import DatadogFlags
import DatadogSDKReactNative

@objc(FlagsExperimentSupport)
public final class FlagsExperimentSupport: NSObject {
    static let mode = ProcessInfo.processInfo.environment["DD_FLAGS_EXPERIMENT"] ?? ""
    private static var initialization: [String: Any] = [:]
    private static let tracking = DdFlagsImplementation()

    static func prepare() {
        #if targetEnvironment(simulator)
        guard ["none", "bridge-only", "exposures", "evaluations", "both"].contains(mode) || mode.hasPrefix("batching-") else { return }
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
            trackExposures: mode == "exposures" || mode == "both" || mode.hasPrefix("batching-"),
            customEvaluationEndpoint: URL(string: "\(endpoint)/evaluations"),
            trackEvaluations: mode == "evaluations" || mode == "both" || mode.hasPrefix("batching-"),
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

    @objc public static func trackingQueue() -> DispatchQueue { RNQueue.getSharedQueue() }

    @objc public static func trackRecords(_ records: NSArray) -> String? {
        #if !targetEnvironment(simulator) || DEBUG
        return "Batch tracking requires a Release simulator build"
        #else
        guard !initialization.isEmpty else { return "Native tracking not initialized" }
        guard (1...25).contains(records.count) else { return "Invalid batch size" }
        for raw in records {
            guard let record = raw as? NSDictionary,
                  let client = record["client"] as? String,
                  let key = record["key"] as? String,
                  let flag = record["flag"] as? NSDictionary,
                  let target = record["targetingKey"] as? String,
                  let attributes = record["attributes"] as? NSDictionary else { return "Invalid tracking record" }
            var resolved = false
            var failure: String?
            tracking.trackEvaluation(client, key: key, rawFlag: flag, targetingKey: target, attributes: attributes,
                resolve: { _ in resolved = true }, reject: { code, message, _ in failure = "\(code): \(message)" })
            if let failure { return failure }
            guard resolved else { return "Tracking implementation did not acknowledge synchronously" }
        }
        return nil
        #endif
    }

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
