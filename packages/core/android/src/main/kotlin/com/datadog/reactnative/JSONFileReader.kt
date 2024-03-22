/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.content.Context

/**
 * Utility for parsing JSON files from the app assets.
 */
internal class JSONFileReader {
    internal fun parseAssetsJSONFile(appContext: Context, filePath: String): String {
        return appContext.assets.open(filePath).use {
            it.bufferedReader().readText()
        }
    }
}
