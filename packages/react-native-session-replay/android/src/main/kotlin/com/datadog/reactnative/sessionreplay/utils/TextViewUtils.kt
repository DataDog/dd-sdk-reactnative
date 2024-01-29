/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.datadog.reactnative.sessionreplay.utils

import android.widget.TextView
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.TextPropertiesResolver

internal class TextViewUtils {
    internal fun mapTextViewToWireframes(
        wireframes: List<MobileSegment.Wireframe>,
        view: TextView,
        mappingContext: MappingContext,
        reactTextPropertiesResolver: TextPropertiesResolver
    ): List<MobileSegment.Wireframe> {
        val result = mutableListOf<MobileSegment.Wireframe>()
        val pixelDensity = mappingContext.systemInformation.screenDensity

        for (originalWireframe in wireframes) {
            if (originalWireframe !is MobileSegment.Wireframe.TextWireframe) {
                result.add(originalWireframe)
            } else {
                result.add(reactTextPropertiesResolver.addReactNativeProperties(
                    originalWireframe = originalWireframe,
                    view = view,
                    pixelDensity = pixelDensity,
                ))
            }
        }

        return result
    }
}
