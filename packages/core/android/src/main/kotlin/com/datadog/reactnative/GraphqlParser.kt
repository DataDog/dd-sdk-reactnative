/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative

import com.datadog.android.rum.model.ResourceEvent

/**
 * Parses GraphQL data from React Native into ResourceEvent errors.
 */
object GraphqlParser {
    /**
     * Accepts the raw value stored under "_dd.graphql.errors".
     *
     * Expected RN shape:
     *  - Map { "errors": [ { "message": "...", "code": "...", "path": [...], "locations": [...] }, ... ] }
     *
     * Returns null if missing / invalid.
     */
    fun parse(rawGraphqlErrors: Any?): List<ResourceEvent.Error>? {
        val wrapper = rawGraphqlErrors as? Map<*, *> ?: return null
        val errorsList = wrapper["errors"] as? List<*> ?: return null

        val parsed = errorsList.mapNotNull { parseError(it) }
        return parsed.takeIf { it.isNotEmpty() }
    }

    private fun parseError(item: Any?): ResourceEvent.Error? {
        val m = item as? Map<*, *> ?: return null

        val message = m["message"] as? String ?: return null
        val code = m["code"] as? String

        val locations = parseLocations(m["locations"])
        val path = parsePath(m["path"])

        return ResourceEvent.Error(
            message = message,
            code = code,
            locations = locations,
            path = path
        )
    }

    private fun parseLocations(raw: Any?): List<ResourceEvent.Location>? {
        val list = raw as? List<*> ?: return null
        val parsed = list.mapNotNull { parseLocation(it) }
        return parsed.takeIf { it.isNotEmpty() }
    }

    private fun parseLocation(locAny: Any?): ResourceEvent.Location? {
        val locMap = locAny as? Map<*, *> ?: return null
        val line = (locMap["line"] as? Number)?.toLong() ?: return null
        val column = (locMap["column"] as? Number)?.toLong() ?: return null
        return ResourceEvent.Location(line = line, column = column)
    }

    private fun parsePath(raw: Any?): List<ResourceEvent.Path>? {
        val list = raw as? List<*> ?: return null
        val parsed = list.mapNotNull { seg ->
            when (seg) {
                is String -> ResourceEvent.Path.String(seg)
                is Number -> ResourceEvent.Path.Long(seg.toLong())
                else -> null
            }
        }
        return parsed.takeIf { it.isNotEmpty() }
    }
}