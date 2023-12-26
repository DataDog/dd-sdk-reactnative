/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import android.view.View
import androidx.annotation.VisibleForTesting
import com.datadog.android.api.InternalLogger
import com.datadog.android.sessionreplay.ExtensionSupport
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.internal.recorder.OptionSelectorDetector
import com.datadog.android.sessionreplay.internal.recorder.mapper.WireframeMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactMaskInputTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactMaskTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactTextMapper
import com.datadog.reactnative.sessionreplay.mappers.ReactViewGroupMapper
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.textinput.ReactEditText
import com.facebook.react.views.view.ReactViewGroup

internal class ReactNativeSessionReplayExtensionSupport(
    private val reactContext: ReactContext,
    private val logger: InternalLogger
) : ExtensionSupport {

    override fun getCustomViewMappers(): Map<SessionReplayPrivacy, Map<Class<*>, WireframeMapper<View, *>>> {
        val uiManagerModule = getUiManagerModule()

        return mapOf(
            SessionReplayPrivacy.ALLOW to mapOf(
                ReactViewGroup::class.java to ReactViewGroupMapper(),
                ReactTextView::class.java to ReactTextMapper(reactContext, uiManagerModule),
                ReactEditText::class.java to ReactTextMapper(reactContext, uiManagerModule)
            ),
            SessionReplayPrivacy.MASK to mapOf(
                ReactViewGroup::class.java to ReactViewGroupMapper(),
                ReactTextView::class.java to ReactMaskTextMapper(reactContext, uiManagerModule),
                ReactEditText::class.java to ReactMaskTextMapper(reactContext, uiManagerModule)
            ),
            SessionReplayPrivacy.MASK_USER_INPUT to mapOf(
                ReactViewGroup::class.java to ReactViewGroupMapper(),
                ReactTextView::class.java to ReactMaskInputTextMapper(reactContext, uiManagerModule),
                ReactEditText::class.java to ReactMaskInputTextMapper(reactContext, uiManagerModule)
            )
        ).mapValues {
            it.value as Map<Class<*>, WireframeMapper<View, *>>
        }
    }

    override fun getOptionSelectorDetectors(): List<OptionSelectorDetector> {
        return listOf()
    }

    @VisibleForTesting
    internal fun getUiManagerModule(): UIManagerModule? {
        return try {
            reactContext.getNativeModule(UIManagerModule::class.java)
        } catch (e: IllegalStateException) {
            logger.log(
                level = InternalLogger.Level.WARN,
                targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
                messageBuilder = { RESOLVE_UIMANAGERMODULE_ERROR },
                throwable = e
            )
            return null
        }
    }

    internal companion object {
        internal const val RESOLVE_UIMANAGERMODULE_ERROR = "Unable to resolve UIManagerModule"
    }
}
