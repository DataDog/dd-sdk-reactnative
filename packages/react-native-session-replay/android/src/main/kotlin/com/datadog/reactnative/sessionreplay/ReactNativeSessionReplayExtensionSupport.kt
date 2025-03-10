/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.android.sessionreplay.ExtensionSupport
import com.datadog.android.sessionreplay.MapperTypeWrapper
import com.datadog.android.sessionreplay.recorder.OptionSelectorDetector
import com.datadog.android.sessionreplay.utils.DrawableToColorMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactEditTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactNativeImageViewMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewGroupMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewModalMapper
import com.datadog.reactnative.sessionreplay.utils.text.TextViewUtils
import com.facebook.react.views.image.ReactImageView
import com.facebook.react.views.modal.ReactModalHostView
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.view.ReactViewGroup


internal class ReactNativeSessionReplayExtensionSupport(
    private val textViewUtils: TextViewUtils
) : ExtensionSupport {
    override fun name(): String {
        return ReactNativeSessionReplayExtensionSupport::class.java.simpleName
    }

    override fun getCustomViewMappers(): List<MapperTypeWrapper<*>> {
        return listOf(
            MapperTypeWrapper(ReactImageView::class.java, ReactNativeImageViewMapper()),
            MapperTypeWrapper(ReactViewGroup::class.java, ReactViewGroupMapper()),
            MapperTypeWrapper(ReactTextView::class.java, ReactTextMapper(textViewUtils)),
            MapperTypeWrapper(ReactEditText::class.java, ReactEditTextMapper(textViewUtils)),
            MapperTypeWrapper(ReactModalHostView::class.java, ReactViewModalMapper()),
        )
    }

    override fun getOptionSelectorDetectors(): List<OptionSelectorDetector> {
        return listOf()
    }

    override fun getCustomDrawableMapper(): List<DrawableToColorMapper> {
        return emptyList()
    }
}
