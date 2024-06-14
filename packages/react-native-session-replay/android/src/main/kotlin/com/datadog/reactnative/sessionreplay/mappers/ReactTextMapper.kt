/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.TextViewMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.utils.DefaultColorStringFormatter
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver
import com.datadog.android.sessionreplay.utils.DefaultViewIdentifierResolver
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.reactnative.sessionreplay.NoopTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.ReactTextPropertiesResolver
import com.datadog.reactnative.sessionreplay.TextPropertiesResolver
import com.datadog.reactnative.sessionreplay.utils.TextViewUtils
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule

internal class ReactTextMapper(
    private val reactTextPropertiesResolver: TextPropertiesResolver =
        NoopTextPropertiesResolver(),
    private val textViewUtils: TextViewUtils = TextViewUtils(),
): TextViewMapper<TextView>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault()
) {

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
        asyncJobStatusCallback: AsyncJobStatusCallback,
        internalLogger: InternalLogger
    ): List<MobileSegment.Wireframe> {
        val wireframes = super.map(view, mappingContext, asyncJobStatusCallback, internalLogger)
        return textViewUtils.mapTextViewToWireframes(
            wireframes = wireframes,
            view = view,
            mappingContext = mappingContext,
            reactTextPropertiesResolver = reactTextPropertiesResolver
        )
    }
}
