/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.widget.TextView
import androidx.annotation.VisibleForTesting
import com.datadog.android.sessionreplay.internal.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.mapper.TextViewMapper
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.NoopTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.ReactTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.TextPropertiesResolver
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule

internal class ReactTextMapper(
    private val reactTextPropertiesResolver: TextPropertiesResolver =
        NoopTextPropertiesResolver()
): TextViewMapper() {

    internal constructor(
        reactContext: ReactContext,
        uiManagerModule: UIManagerModule?
    ): this(
        reactTextPropertiesResolver = if (uiManagerModule == null) {
            NoopTextPropertiesResolver()
        } else {
            ReactTextPropertiesResolver(
                reactContext = reactContext,
                uiManagerModule = uiManagerModule
            )
        }
    )

    override fun map(
        view: TextView,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback
    ): List<MobileSegment.Wireframe> {
        val result = mutableListOf<MobileSegment.Wireframe>()
        val wireframes = mapOnSuperclass(view, mappingContext, asyncJobStatusCallback)
        val pixelDensity = mappingContext.systemInformation.screenDensity

        wireframes.forEach { originalWireframe ->
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

    @VisibleForTesting
    internal fun mapOnSuperclass(
        textView: TextView,
        mappingContext: MappingContext,
        asyncJobStatusCallback: AsyncJobStatusCallback
    ): List<MobileSegment.Wireframe> {
        return super.map(textView, mappingContext, asyncJobStatusCallback)
    }
}
