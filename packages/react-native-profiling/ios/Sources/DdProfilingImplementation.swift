/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import Foundation
import DatadogProfiling
import DatadogCore
import DatadogInternal
import React

@objc
public class DdProfilingImplementation: NSObject {
    private lazy var profiling: ProfilingProtocol = profilingProvider()
    private let profilingProvider: () -> ProfilingProtocol

    internal init(
        profilingProvider: @escaping () -> ProfilingProtocol
    ) {
        self.profilingProvider = profilingProvider
    }

    @objc
    public override convenience init() {
        self.init(profilingProvider: { NativeProfiling() })
    }

    @objc
    public func enable(
        applicationLaunchSampleRate: Double,
        continuousSampleRate: Double,
        customEndpoint: String,
        resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) -> Void {
        var customEndpointURL: URL? = nil
        if (customEndpoint != "") {
            customEndpointURL = URL(string: customEndpoint)
        }

        var profilingConfiguration = Profiling.Configuration(customEndpoint: customEndpointURL)

        // A negative sample rate means none was set from JS, so the native SDK default is kept.
        if (applicationLaunchSampleRate >= 0) {
            profilingConfiguration.applicationLaunchSampleRate = Float(applicationLaunchSampleRate)
        }

        if (continuousSampleRate >= 0) {
            profilingConfiguration.continuousSampleRate = Float(continuousSampleRate)
        }

        profiling.enable(with: profilingConfiguration, in: CoreRegistry.default)

        resolve(nil)
    }
}

internal protocol ProfilingProtocol {
    func enable(
        with configuration: Profiling.Configuration,
        in core: DatadogCoreProtocol
    )
}

internal class NativeProfiling: ProfilingProtocol {
    func enable(with configuration: Profiling.Configuration, in core: DatadogCoreProtocol) {
        Profiling.enable(with: configuration, in: core)
    }
}
