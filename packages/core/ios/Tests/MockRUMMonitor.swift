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
    init () {
        self.debug = false
    }

    func addAttribute(forKey key: DatadogInternal.AttributeKey, value: DatadogInternal.AttributeValue) {
        addedAttributes[key] = value
    }

    func removeAttribute(forKey key: DatadogInternal.AttributeKey) {}

    var debug: Bool

    struct Interval: Equatable {
        let start: Date?
        let end: Date?
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
        case stopSession(_: Int? = nil) // We need an attribute for the case to be Equatable
        case addResourceMetrics(resourceKey: String,
                                fetch: Interval,
                                redirection: Interval,
                                dns: Interval,
                                connect: Interval,
                                ssl: Interval,
                                firstByte: Interval,
                                download: Interval,
                                responseSize: Int64?)
        case addLongTasks(time: Date, duration: TimeInterval)
        case updatePerformanceMetric(time: Date, metric: DatadogRUM.PerformanceMetric, value: Double)
    }

    var calledMethods = [CalledMethod]()
    var receivedAttributes = [[AttributeKey: AttributeValue]]()
    private(set) var addedAttributes = [AttributeKey: AttributeValue]()
    private(set) var receivedFeatureFlags = [String: Encodable]()
    var lastReceivedPerformanceMetrics = [PerformanceMetric: Double]()
    var receivedLongTasks = [Date: TimeInterval]()

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

    public func addLongTask(at time: Date, duration: TimeInterval, attributes: [AttributeKey: AttributeValue]) {
        monitor.calledMethods.append(
            .addLongTasks(time: time, duration: duration)
        )
        monitor.receivedAttributes.append(attributes)
        monitor.receivedLongTasks[time] = duration
    }

    public func updatePerformanceMetric(at time: Date, metric: DatadogRUM.PerformanceMetric, value: Double, attributes: [AttributeKey: AttributeValue]) {
        monitor.calledMethods.append(
            .updatePerformanceMetric(time: time, metric: metric, value: value)
        )
        monitor.receivedAttributes.append(attributes)
        monitor.lastReceivedPerformanceMetrics[metric] = value
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
        responseSize: Int64?,
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
                responseSize: responseSize
            )
        )
        monitor.receivedAttributes.append(attributes)
    }
}
