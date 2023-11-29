/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.view.View
import com.datadog.android.sessionreplay.ExtensionSupport
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.internal.recorder.OptionSelectorDetector
import com.datadog.android.sessionreplay.internal.recorder.mapper.WireframeMapper
import com.facebook.react.views.view.ReactViewGroup

internal class ReactNativeSessionReplayExtensionSupport : ExtensionSupport {

    override fun getCustomViewMappers(): Map<SessionReplayPrivacy, Map<Class<*>, WireframeMapper<View, *>>> {
        return mapOf(SessionReplayPrivacy.ALLOW to mapOf(
            ReactViewGroup::class.java to ReactViewGroupMapper() as WireframeMapper<View, *>
        ))
    }

    override fun getOptionSelectorDetectors(): List<OptionSelectorDetector> {
        return listOf()
    }
}
