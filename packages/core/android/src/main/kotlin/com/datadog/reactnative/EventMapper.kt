/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.datadog.android.event.EventMapper
import com.datadog.android.log.model.LogEvent

internal class LogEventMapper: EventMapper<LogEvent> {
    override fun map(event: LogEvent): LogEvent {
        // Extra info does not get added to the event, it's not in additionalProperties
        val extraUserInfo =
            event.additionalProperties.remove("_dd.extraUserInfo") as? Map<out String, *>
        extraUserInfo?.let {
            event.usr?.additionalProperties?.clear()
            event.usr?.additionalProperties?.putAll(it)
        }

        return event
    }
}