/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

private const val HEX_COLOR_INCLUDING_ALPHA_LENGTH: Int = 8

internal fun formatAsRgba(backgroundColor: Int): String {
    val colorHexString = Integer.toHexString(backgroundColor)
    return "#${convertArgbToRgba(colorHexString)}"
}

private fun convertArgbToRgba(hexString: String): String {
    return if (hexString.length == HEX_COLOR_INCLUDING_ALPHA_LENGTH) {
        hexString.substring(2, 8) + hexString.substring(0, 2)
    } else {
        hexString
    }
}
