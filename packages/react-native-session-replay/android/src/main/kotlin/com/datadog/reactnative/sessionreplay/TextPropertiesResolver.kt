/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.datadog.reactnative.sessionreplay

import android.widget.TextView
import com.datadog.android.sessionreplay.model.MobileSegment

internal interface TextPropertiesResolver {
    fun addReactNativeProperties(
        originalWireframe: MobileSegment.Wireframe.TextWireframe,
        view: TextView,
        pixelDensity: Float,
    ): MobileSegment.Wireframe.TextWireframe
}
