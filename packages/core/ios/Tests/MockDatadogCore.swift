/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

@testable import DatadogCore
@testable import DatadogInternal

internal class MockDatadogCore: DatadogCoreProtocol {
    func set(baggage: @escaping () -> DatadogInternal.FeatureBaggage?, forKey key: String) {}
    
    func send(message: FeatureMessage, else fallback: @escaping () -> Void) {
        if  // Configuration Telemetry Message
            case .telemetry(let telemetry) = message,
            case .configuration(let configuration) = telemetry {
            self.configuration = configuration
        }
        
        if case .baggage(let key, let baggage) = message {
            self.baggages[key] = baggage
        }
    }
   
    @ReadWriteLock
    private(set) var configuration: ConfigurationTelemetry?
    @ReadWriteLock
    private(set) var features: [String: DatadogFeature] = [:]
    @ReadWriteLock
    private(set) var baggages: [String: Any] = [:]

    func register<T>(feature: T) throws where T : DatadogFeature {
        features[T.name] = feature
    }
    
    func get<T>(feature type: T.Type) -> T? where T : DatadogFeature {
        return nil
    }
    
    func scope(for feature: String) -> FeatureScope? {
        return nil
    }
    
    func set(feature: String, attributes: @escaping () -> FeatureBaggage) {}
    
    func update(feature: String, attributes: @escaping () -> FeatureBaggage) {}
}

