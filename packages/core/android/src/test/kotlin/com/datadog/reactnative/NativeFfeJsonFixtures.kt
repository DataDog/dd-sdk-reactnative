/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import org.json.JSONArray
import org.json.JSONObject

internal fun readNativeFfeFixture(owner: Class<*>, relativePath: String): String {
    return owner.classLoader
        ?.getResource(relativePath)
        ?.readText()
        ?: error("Missing FFE fixture: $relativePath")
}

internal fun JSONObject.optionalNativeFfeString(key: String): String? {
    if (!has(key) || isNull(key)) {
        return null
    }
    return getString(key)
}

internal fun JSONObject.toNativeFfeFixtureMap(): Map<String, Any?> {
    return keys().asSequence().associateWith { key -> get(key).toNativeFfeFixtureValue() }
}

internal fun JSONArray.toNativeFfeFixtureList(): List<Any?> {
    return (0 until length()).map { index -> get(index).toNativeFfeFixtureValue() }
}

internal fun Any?.toNativeFfeFixtureValue(): Any? {
    return when (this) {
        JSONObject.NULL -> null
        is JSONObject -> toNativeFfeFixtureMap()
        is JSONArray -> toNativeFfeFixtureList()
        else -> this
    }
}
