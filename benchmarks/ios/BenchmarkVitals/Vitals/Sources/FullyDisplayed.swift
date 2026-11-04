/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import UIKit

/// Measures the time from process start to the moment the app reports itself as fully displayed,
/// independently from the Datadog SDK, so that `baseline` and `instrumented` runs can be compared.
///
/// The value is submitted once as a distribution metric, so the median and percentiles can be
/// computed across runs.
internal enum FullyDisplayed {
    struct MetricContext {
        let apiKey: String
        let run: String
        let scenario: String
        let env: String
    }

    // swiftlint:disable force_unwrapping
    private static let intake = URL(string: "https://api.datadoghq.com/api/v1/distribution_points")!
    // swiftlint:enable force_unwrapping

    private static let pendingColdStartKey = "com.datadoghq.benchmarks.rn.pendingColdStart"

    /// Saves the cold start test config, to run it on the next launch of the app.
    ///
    /// The time to fully displayed is measured from process start, so the scenario cannot be started
    /// by a deep link opened in a running app: it must be armed, then the app must be restarted.
    static func armColdStart(config: NSDictionary) {
        UserDefaults.standard.set(config, forKey: pendingColdStartKey)
    }

    /// Returns the armed cold start test config, if any, and removes it so it runs only once.
    static func consumeColdStartConfig() -> NSDictionary? {
        let config = UserDefaults.standard.dictionary(forKey: pendingColdStartKey)
        UserDefaults.standard.removeObject(forKey: pendingColdStartKey)
        return config as NSDictionary?
    }

    /// Returns `true` if iOS pre-warmed the process, in which case the process start time
    /// is not related to the moment the user launched the app.
    static var isPrewarmed: Bool {
        ProcessInfo.processInfo.environment["ActivePrewarm"] == "1"
    }

    /// The process start time, read from the kernel.
    ///
    /// This is the same reference the Datadog iOS SDK uses for app launch metrics.
    static func processStartDate() -> Date? {
        var kinfo = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

        guard sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0) == 0 else {
            return nil
        }

        let startTime = kinfo.kp_proc.p_un.__p_starttime
        return Date(timeIntervalSince1970: TimeInterval(startTime.tv_sec) + TimeInterval(startTime.tv_usec) / 1_000_000)
    }

    /// Submits the time to fully displayed, in milliseconds.
    static func submit(durationMs: Double, metric: String, context: MetricContext) {
        let tags = [
            "device_model:\(UIDevice.current.model)",
            "os:\(UIDevice.current.systemName)",
            "os_version:\(UIDevice.current.systemVersion)",
            "run:\(context.run)",
            "scenario:\(context.scenario)",
            "env:\(context.env)",
            "application_id:\(Bundle.main.bundleIdentifier ?? "unknown.bundle.id")",
        ]

        let body: [String: Any] = [
            "series": [
                [
                    "metric": metric,
                    "points": [[Int64(Date().timeIntervalSince1970), [durationMs]]],
                    "tags": tags,
                ],
            ],
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: body) else {
            return
        }

        var request = URLRequest(url: intake)
        request.httpMethod = "POST"
        request.allHTTPHeaderFields = [
            "Content-Type": "application/json",
            "DD-API-KEY": context.apiKey,
        ]
        request.httpBody = data

        URLSession(configuration: .ephemeral).dataTask(with: request) { _, response, error in
            if let error {
                NSLog("[Benchmark] Failed to submit \(metric): \(error)")
            } else if let response = response as? HTTPURLResponse, !(200..<300).contains(response.statusCode) {
                NSLog("[Benchmark] Failed to submit \(metric): HTTP \(response.statusCode)")
            }
        }.resume()
    }
}
