/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

@file:Suppress("LabeledExpression", "TooGenericExceptionCaught")

package com.datadog.reactnative

import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import org.json.JSONArray
import org.json.JSONObject

private const val NATIVE_FFE_KIND_RULES = "rules"
private const val NATIVE_FFE_KIND_PRECOMPUTED = "precomputed"
private const val NATIVE_FFE_HTTP_GET = "GET"
private const val NATIVE_FFE_WIRE_SECTION_SERVER = "server"

internal class NativeFfeConfigurationFetcher(
    private val transport: NativeFfeConfigurationTransport = UrlConnectionNativeFfeConfigurationTransport(),
    private val clockMs: () -> Long = { System.currentTimeMillis() },
) {
    fun fetch(kind: String, options: Map<String, Any?>): NativeFfeFetchedConfiguration {
        val fetchOptions = NativeFfeFetchOptions.from(kind, options)
        val request = fetchOptions.toRequest()
        val response = try {
            transport.execute(request)
        } catch (error: Exception) {
            throw NativeFfeConfigurationFetchException(request, error)
        }

        val wire = when (response.statusCode) {
            HTTP_NOT_MODIFIED -> fetchOptions.previousConfigurationWire
                ?: throw NativeFfeConfigurationFetchException(
                    request,
                    IllegalStateException("304 response requires previousConfigurationWire"),
                )
            in HTTP_SUCCESS_RANGE -> buildWire(kind, response, fetchOptions)
            else -> throw NativeFfeConfigurationFetchException(
                request,
                IllegalStateException("Unexpected native flags fetch status: ${response.statusCode}"),
            )
        }

        return NativeFfeFetchedConfiguration(
            wire = wire,
            request = request,
            statusCode = response.statusCode,
        )
    }

    private fun buildWire(
        kind: String,
        response: NativeFfeHttpResponse,
        options: NativeFfeFetchOptions,
    ): String {
        val payload = JSONObject()
            .put("response", response.body)
            .put("fetchedAt", clockMs())

        response.header("etag")?.takeIf { it.isNotBlank() }?.let {
            payload.put("etag", it)
        }
        if (kind == NATIVE_FFE_KIND_PRECOMPUTED && options.evaluationContext.isNotEmpty()) {
            payload.put("context", options.evaluationContext.toNativeFfeJSONObject())
        }

        return JSONObject()
            .put("version", SUPPORTED_WIRE_VERSION)
            .put(kind.toWireSection(), payload)
            .toString()
    }

    private fun NativeFfeHttpResponse.header(name: String): String? {
        return headers.entries.firstOrNull { it.key.equals(name, ignoreCase = true) }?.value
    }

    private companion object {
        const val SUPPORTED_WIRE_VERSION = 2
        const val HTTP_NOT_MODIFIED = 304
        val HTTP_SUCCESS_RANGE = 200..299
    }
}

internal data class NativeFfeFetchedConfiguration(
    val wire: String,
    val request: NativeFfeHttpRequest,
    val statusCode: Int,
)

internal data class NativeFfeHttpRequest(
    val url: String,
    val method: String,
    val headers: Map<String, String>,
) {
    fun toDebugMap(statusCode: Int? = null): Map<String, Any?> {
        return mapOf(
            "url" to url,
            "method" to method,
            "headers" to headers,
            "statusCode" to statusCode,
        ).filterValues { it != null }
    }
}

internal data class NativeFfeHttpResponse(
    val statusCode: Int,
    val headers: Map<String, String>,
    val body: String,
)

internal interface NativeFfeConfigurationTransport {
    fun execute(request: NativeFfeHttpRequest): NativeFfeHttpResponse
}

internal class NativeFfeConfigurationFetchException(
    val request: NativeFfeHttpRequest,
    cause: Throwable,
) : Exception(cause.message, cause)

private data class NativeFfeFetchOptions(
    val kind: String,
    val endpoint: String,
    val clientToken: String?,
    val sdkKey: String?,
    val site: String?,
    val headers: Map<String, String>,
    val flagQueryParams: Map<String, Any?>,
    val evaluationContext: Map<String, Any?>,
    val previousConfigurationWire: String?,
) {
    fun toRequest(): NativeFfeHttpRequest {
        val requestHeaders = linkedMapOf(
            "Accept" to "application/json",
        )

        clientToken?.let { requestHeaders["DD-Client-Token"] = it }
        sdkKey?.let { requestHeaders["DD-SDK-Key"] = it }
        site?.let { requestHeaders["DD-Site"] = it }
        previousConfigurationWire?.extractEtag(kind)?.let { requestHeaders["If-None-Match"] = it }
        requestHeaders.putAll(headers)

        return NativeFfeHttpRequest(
            url = buildUrl(),
            method = NATIVE_FFE_HTTP_GET,
            headers = requestHeaders,
        )
    }

    private fun buildUrl(): String {
        val queryParams = linkedMapOf<String, Any?>()
        queryParams.putAll(flagQueryParams)
        if (kind == NATIVE_FFE_KIND_PRECOMPUTED && evaluationContext.isNotEmpty()) {
            queryParams["evaluationContext"] = evaluationContext.toNativeFfeJSONObject().toString()
        }

        val query = queryParams.entries
            .filter { it.value != null }
            .joinToString("&") { (key, value) ->
                "${key.urlEncode()}=${value.toString().urlEncode()}"
            }
        if (query.isBlank()) {
            return endpoint
        }

        val separator = if (endpoint.contains("?")) "&" else "?"
        return "$endpoint$separator$query"
    }

    private fun String.extractEtag(kind: String): String? {
        val wireJson = JSONObject(this)
        return wireJson.optJSONObject(kind.toWireSection())
            ?.optString("etag")
            ?.takeIf { it.isNotBlank() }
            ?: wireJson.optJSONObject(NATIVE_FFE_WIRE_SECTION_SERVER)
                ?.optString("etag")
                ?.takeIf { it.isNotBlank() }
            ?: wireJson.optJSONObject(NATIVE_FFE_KIND_PRECOMPUTED)
                ?.optString("etag")
                ?.takeIf { it.isNotBlank() }
    }

    companion object {
        fun from(kind: String, options: Map<String, Any?>): NativeFfeFetchOptions {
            return NativeFfeFetchOptions(
                kind = kind,
                endpoint = options["endpoint"]?.toString()?.takeIf { it.isNotBlank() }
                    ?: throw IllegalArgumentException("Flags fetch requires endpoint"),
                clientToken = options["clientToken"]?.toString()?.takeIf { it.isNotBlank() },
                sdkKey = options["sdkKey"]?.toString()?.takeIf { it.isNotBlank() },
                site = options["site"]?.toString()?.takeIf { it.isNotBlank() },
                headers = options["headers"].toStringMap(),
                flagQueryParams = options["flagQueryParams"].toAnyMap(),
                evaluationContext = options["evaluationContext"].toAnyMap(),
                previousConfigurationWire = options["previousConfigurationWire"]?.toString(),
            )
        }
    }

}

private class UrlConnectionNativeFfeConfigurationTransport : NativeFfeConfigurationTransport {
    override fun execute(request: NativeFfeHttpRequest): NativeFfeHttpResponse {
        val connection = URL(request.url).openConnection() as HttpURLConnection
        connection.requestMethod = request.method
        connection.connectTimeout = TIMEOUT_MS
        connection.readTimeout = TIMEOUT_MS
        request.headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }

        val statusCode = connection.responseCode
        val stream = if (statusCode >= HTTP_BAD_REQUEST) {
            connection.errorStream
        } else {
            connection.inputStream
        }
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
        val headers = connection.headerFields
            .orEmpty()
            .mapNotNull { (key, values) ->
                key?.let { it to values.firstOrNull().orEmpty() }
            }
            .toMap()

        connection.disconnect()
        return NativeFfeHttpResponse(statusCode, headers, body)
    }

    private companion object {
        const val TIMEOUT_MS = 5_000
        const val HTTP_BAD_REQUEST = 400
    }
}

private fun Any?.toStringMap(): Map<String, String> {
    return (this as? Map<*, *>)
        ?.mapNotNull { (key, value) ->
            val stringKey = key as? String ?: return@mapNotNull null
            value?.toString()?.let { stringKey to it }
        }
        ?.toMap()
        ?: emptyMap()
}

private fun Any?.toAnyMap(): Map<String, Any?> {
    return (this as? Map<*, *>)
        ?.mapNotNull { (key, value) ->
            (key as? String)?.let { it to value }
        }
        ?.toMap()
        ?: emptyMap()
}

private fun String.urlEncode(): String = URLEncoder.encode(this, "UTF-8")

private fun String.toWireSection(): String {
    return if (this == NATIVE_FFE_KIND_RULES) {
        NATIVE_FFE_WIRE_SECTION_SERVER
    } else {
        this
    }
}

private fun Map<*, *>.toNativeFfeJSONObject(): JSONObject {
    val jsonObject = JSONObject()
    for ((key, value) in this) {
        jsonObject.put(key.toString(), value.toNativeFfeJsonValue())
    }
    return jsonObject
}

private fun List<*>.toNativeFfeJSONArray(): JSONArray {
    val jsonArray = JSONArray()
    for (value in this) {
        jsonArray.put(value.toNativeFfeJsonValue())
    }
    return jsonArray
}

private fun Any?.toNativeFfeJsonValue(): Any? = when (this) {
    is Map<*, *> -> toNativeFfeJSONObject()
    is List<*> -> toNativeFfeJSONArray()
    null -> JSONObject.NULL
    else -> this
}
