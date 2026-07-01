/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import java.io.File
import org.json.JSONArray
import org.json.JSONObject

internal fun readNativeFfeFixture(owner: Class<*>, relativePath: String): String {
    return owner.classLoader
        ?.getResource(relativePath)
        ?.readText()
        ?: error("Missing FFE fixture: $relativePath")
}

internal fun nativeFfeRulesConfigurationWire(
    response: String,
    etag: String = "ffe-system-test-data"
): String {
    return JSONObject()
        .put("version", 2)
        .put(
            "server",
            JSONObject()
                .put("response", response)
                .put("etag", etag)
        )
        .toString()
}

internal fun listNativeFfeFixtureFiles(owner: Class<*>, relativeDirectory: String): List<String> {
    val resource = owner.classLoader
        ?.getResource(relativeDirectory)
        ?: error("Missing FFE fixture directory: $relativeDirectory")
    val directory = File(resource.toURI())
    return directory
        .listFiles { file -> file.isFile && file.extension == "json" }
        ?.map { it.name }
        ?.sorted()
        ?: error("Missing FFE fixture files: $relativeDirectory")
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
