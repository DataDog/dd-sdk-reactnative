package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.facebook.react.views.modal.ReactModalHostView

internal class ReactViewModalMapper(
    private val drawableUtils: DrawableUtils =
        ReactViewBackgroundDrawableUtils()
) : DefaultMapper<ReactModalHostView>(drawableUtils)
