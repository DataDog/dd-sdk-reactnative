/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.widget.TextView
import com.datadog.android.sessionreplay.internal.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.mapper.MaskTextViewMapper
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.reactnative.sessionreplay.NoopTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.ReactTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.TextPropertiesResolver
import com.datadog.reactnative.sessionreplay.utils.TextViewUtils
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule

internal class ReactMaskTextMapper(
    private val reactTextPropertiesResolver: TextPropertiesResolver =
        NoopTextPropertiesResolver(),
    private val textViewUtils: TextViewUtils = TextViewUtils()
): MaskTextViewMapper() {

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
        val wireframes = super.map(view, mappingContext, asyncJobStatusCallback)
        return textViewUtils.mapTextViewToWireframes(
            wireframes = wireframes,
            view = view,
            mappingContext = mappingContext,
            reactTextPropertiesResolver = reactTextPropertiesResolver
        )
    }
}

