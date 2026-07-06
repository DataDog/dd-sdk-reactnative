/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

@testable import DatadogCore
@testable import DatadogRUM
@testable import DatadogInternal
@testable import DatadogSDKReactNative

internal class MockRUMMonitor: RUMMonitorProtocol {
    func reportAppFullyDisplayed() {
        // not implemented
    }
    
    func currentSessionID(completion: @escaping (String?) -> Void) {
        // not implemented
    }
    
    init () {
        self.debug = false
    }
    
    func addAttribute(forKey key: DatadogInternal.AttributeKey, value: DatadogInternal.AttributeValue) {
        addedAttributes[key] = value
    }
    
    func removeAttribute(forKey key: DatadogInternal.AttributeKey) {
        addedAttributes.removeValue(forKey: key)
    }
    
    func addAttributes(_ attributes: [DatadogInternal.AttributeKey : any DatadogInternal.AttributeValue]) {
        for (key, value) in attributes {
            addAttribute(forKey: key, value: value)
        }
    }
    
    func removeAttributes(forKeys keys: [DatadogInternal.AttributeKey]) {
        for key in keys {
            removeAttribute(forKey: key)
        }
    }
    
    var debug: Bool
    
    struct Interval: Equatable {
        let start: Date?
        let end: Date?
    }

    struct BodySize: Equatable {
        let encoded: Int64
        let decoded: Int64
    }

    enum CalledMethod: Equatable {
        case startView(key: String, name: String?)
        case stopView(key: String)
        case addError(message: String, source: RUMErrorSource, stack: String?)
        case startResourceLoading(resourceKey: String, httpMethod: RUMMethod, urlString: String)
        case stopResourceLoading(resourceKey: String, statusCode: Int, kind: RUMResourceType, size: Int64?)
        case startUserAction(type: RUMActionType, name: String)
        case stopUserAction(type: RUMActionType, name: String?)
        case addUserAction(type: RUMActionType, name: String)
        case addTiming(name: String)
        case addViewAttribute(key: String)
        case removeViewAttribute(key: String)
        case addViewAttributes(_: Int? = nil) // We need an attribute for the case to be Equatable
        case removeViewAttributes(keys: [String])
        case addViewLoadingTime(overwrite: Bool)
        case reportAppFullyDisplayed(_: Int? = nil) // We need an attribute for the case to be Equatable
        case stopSession(_: Int? = nil) // We need an attribute for the case to be Equatable
        case addResourceMetrics(resourceKey: String,
                                fetch: Interval,
                                redirection: Interval,
                                dns: Interval,
                                connect: Interval,
                                ssl: Interval,
                                firstByte: Interval,
                                download: Interval,
                                responseBodySize: BodySize?,
                                requestBodySize: BodySize?)
        case addLongTasks(time: Date, duration: TimeInterval)
        case updatePerformanceMetric(time: Date, metric: DatadogRUM.PerformanceMetric, value: Double)
        case addAction(time: Date, type: RUMActionType, name: String, heatmapAttributes: HeatmapAttributes?)
    }

    public var calledMethods = [CalledMethod]()
    public var receivedAttributes = [[AttributeKey: AttributeValue]]()
    private(set) var addedAttributes = [AttributeKey: AttributeValue]()
    private(set) var receivedFeatureFlags = [String: Encodable]()
    public var lastReceivedPerformanceMetrics = [PerformanceMetric: Double]()
    public var receivedLongTasks = [Date: TimeInterval]()

    func startView(key: String, name: String?, attributes: [AttributeKey: AttributeValue]) {
        calledMethods.append(.startView(key: key, name: name))
        receivedAttributes.append(attributes)
    }

    func stopView(key: String, attributes: [AttributeKey: AttributeValue]) {
        calledMethods.append(.stopView(key: key))
        receivedAttributes.append(attributes)
    }

    func addError(message: String, type: String?, stack: String?, source: RUMErrorSource, attributes: [String: Encodable], file: StaticString?, line: UInt?) {
        calledMethods.append(.addError(message: message, source: source, stack: stack))
        receivedAttributes.append(attributes)
    }

    func startResource(resourceKey: String, httpMethod: RUMMethod, urlString: String, attributes: [String: Encodable]) {
        calledMethods.append(.startResourceLoading(resourceKey: resourceKey, httpMethod: httpMethod, urlString: urlString))
        receivedAttributes.append(attributes)
    }
    func stopResource(resourceKey: String, statusCode: Int?, kind: RUMResourceType, size: Int64?, attributes: [String: Encodable]) {
        calledMethods.append(.stopResourceLoading(resourceKey: resourceKey, statusCode: statusCode ?? 0, kind: kind, size: size))
        receivedAttributes.append(attributes)
    }
    func startAction(type: RUMActionType, name: String, attributes: [String: Encodable]) {
        calledMethods.append(.startUserAction(type: type, name: name))
        receivedAttributes.append(attributes)
    }
    func stopAction(type: RUMActionType, name: String?, attributes: [String: Encodable]) {
        calledMethods.append(.stopUserAction(type: type, name: name))
        receivedAttributes.append(attributes)
    }
    func addAction(type: RUMActionType, name: String, attributes: [String: Encodable]) {
        calledMethods.append(.addUserAction(type: type, name: name))
        receivedAttributes.append(attributes)
    }
    func addTiming(name: String) {
        calledMethods.append(.addTiming(name: name))
    }
    func addViewAttribute(forKey key: DatadogInternal.AttributeKey, value: any DatadogInternal.AttributeValue) {
        calledMethods.append(.addViewAttribute(key: key))
        receivedAttributes.append([key :value])
    }
        
    func removeViewAttribute(forKey key: DatadogInternal.AttributeKey) {
        calledMethods.append(.removeViewAttribute(key: key))
    }
    
    func addViewAttributes(_ attributes: [DatadogInternal.AttributeKey : any DatadogInternal.AttributeValue]) {
        calledMethods.append(.addViewAttributes())
        receivedAttributes.append(attributes)
    }
    
    func removeViewAttributes(forKeys keys: [DatadogInternal.AttributeKey]) {
        calledMethods.append(.removeViewAttributes(keys: keys))
    }
    
    func addViewLoadingTime(overwrite: Bool) {
        calledMethods.append(.addViewLoadingTime(overwrite: overwrite))
    }
    func reportAppFullyDisplayed() {
        calledMethods.append(.reportAppFullyDisplayed())
    }
    func stopSession() {
        calledMethods.append(.stopSession())
    }
    func addFeatureFlagEvaluation(name: String, value: Encodable) {
        receivedFeatureFlags[name] = value
    }
    
    var _internalMock: MockRUMMonitorInternal {
        MockRUMMonitorInternal(monitor: self)
    }
}

public struct MockRUMMonitorInternal: RUMMonitorInternalProtocol {
    let monitor: MockRUMMonitor

    public func addLongTask(at time: Date, duration: TimeInterval, attributes: [AttributeKey : AttributeValue]) {
        monitor.calledMethods.append(
            .addLongTasks(time: time, duration: duration)
        )
        monitor.receivedAttributes.append(attributes)
        monitor.receivedLongTasks[time] = duration
    }
    
    public func updatePerformanceMetric(at time: Date, metric: DatadogRUM.PerformanceMetric, value: Double, attributes: [AttributeKey : AttributeValue]) {
        monitor.calledMethods.append(
            .updatePerformanceMetric(time: time, metric: metric, value: value)
        )
        monitor.receivedAttributes.append(attributes)
        monitor.lastReceivedPerformanceMetrics[metric] = value
    }

    public func setInternalViewAttribute(
        at time: Date,
        key: AttributeKey,
        value: AttributeValue
    ) {
        // not implemented in mock
    }

    public func addResourceMetrics(
        at time: Date,
        resourceKey: String,
        fetch: (start: Date, end: Date),
        redirection: (start: Date, end: Date)?,
        dns: (start: Date, end: Date)?,
        connect: (start: Date, end: Date)?,
        ssl: (start: Date, end: Date)?,
        firstByte: (start: Date, end: Date)?,
        download: (start: Date, end: Date)?,
        responseBodySize: (encoded: Int64, decoded: Int64)?,
        requestBodySize: (encoded: Int64, decoded: Int64)?,
        attributes: [AttributeKey: AttributeValue]
    ) {
        monitor.calledMethods.append(
            .addResourceMetrics(
                resourceKey: resourceKey,
                fetch: MockRUMMonitor.Interval(start: fetch.start, end: fetch.end),
                redirection: MockRUMMonitor.Interval(start: redirection?.start, end: redirection?.end),
                dns: MockRUMMonitor.Interval(start: dns?.start, end: dns?.end),
                connect: MockRUMMonitor.Interval(start: connect?.start, end: connect?.end),
                ssl: MockRUMMonitor.Interval(start: ssl?.start, end: ssl?.end),
                firstByte: MockRUMMonitor.Interval(start: firstByte?.start, end: firstByte?.end),
                download: MockRUMMonitor.Interval(start: download?.start, end: download?.end),
                responseBodySize: responseBodySize.map { MockRUMMonitor.BodySize(encoded: $0.encoded, decoded: $0.decoded) },
                requestBodySize: requestBodySize.map { MockRUMMonitor.BodySize(encoded: $0.encoded, decoded: $0.decoded) }
            )
        )
        monitor.receivedAttributes.append(attributes)
    }
    
    public func addAction(
        at time: Date,
        type: RUMActionType,
        name: String,
        heatmapAttributes: HeatmapAttributes?,
        attributes: [AttributeKey : any AttributeValue]
    ) {
        monitor.calledMethods.append(
            .addAction(
                time: time,
                type: type,
                name: name,
                heatmapAttributes: heatmapAttributes
            )
        )
        monitor.receivedAttributes.append(attributes)
    }
}
