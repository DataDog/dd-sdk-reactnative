/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2019-2020 Datadog, Inc.
 */

import DatadogRUM
import DatadogInternal

public protocol RUMMonitorInternalProtocol {
    func addLongTask(
        at time: Date,
        duration: TimeInterval,
        attributes: [AttributeKey: AttributeValue]
    )

    func updatePerformanceMetric(
        at time: Date,
        metric: PerformanceMetric,
        value: Double,
        attributes: [AttributeKey: AttributeValue]
    )

    func addResourceMetrics(
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
    )
}

extension DatadogInternalInterface: RUMMonitorInternalProtocol {}
