/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.widget.TextView
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.model.MobileSegment
import com.datadog.android.sessionreplay.recorder.MappingContext
import com.datadog.android.sessionreplay.recorder.mapper.TextViewMapper
import com.datadog.android.sessionreplay.utils.AsyncJobStatusCallback
import com.datadog.android.sessionreplay.utils.DefaultColorStringFormatter
import com.datadog.android.sessionreplay.utils.DefaultViewBoundsResolver
import com.datadog.android.sessionreplay.utils.DefaultViewIdentifierResolver
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils

internal class ReactTextMapper(
    private val textViewUtils: TextViewUtils
): TextViewMapper<TextView>(
    viewIdentifierResolver = DefaultViewIdentifierResolver,
    colorStringFormatter = DefaultColorStringFormatter,
    viewBoundsResolver = DefaultViewBoundsResolver,
    drawableToColorMapper = DrawableToColorMapper.getDefault()
) {

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
        )
    }
}
