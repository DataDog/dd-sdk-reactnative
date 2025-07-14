/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import ReactViewBackgroundDrawableUtils
import com.datadog.android.sessionreplay.recorder.mapper.TraverseAllChildrenMapper
import com.datadog.reactnative.sessionreplay.ReactNativeInternalCallback
import com.datadog.reactnative.sessionreplay.utils.DrawableUtils
import com.facebook.react.views.view.ReactViewGroup

internal class ReactViewGroupMapper(
    private val internalCallback: ReactNativeInternalCallback,
    private val drawableUtils: DrawableUtils =
        ReactViewBackgroundDrawableUtils()
) : DefaultMapper<ReactViewGroup>(drawableUtils, internalCallback), TraverseAllChildrenMapper<ReactViewGroup>
