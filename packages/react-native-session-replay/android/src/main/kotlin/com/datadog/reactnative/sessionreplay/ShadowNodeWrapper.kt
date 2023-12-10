/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.datadog.reactnative.sessionreplay

import androidx.annotation.VisibleForTesting
import com.datadog.reactnative.sessionreplay.utils.ReflectionUtils
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.UIImplementation
import com.facebook.react.uimanager.UIManagerModule
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

internal class ShadowNodeWrapper(
    private val shadowNode: ReactShadowNode<out ReactShadowNode<*>>?,
    private val reflectionUtils: ReflectionUtils = ReflectionUtils()
) {
    internal fun getDeclaredShadowNodeField(fieldName: String): Any? {
        return shadowNode?.let {
            reflectionUtils.getDeclaredField(
                shadowNode,
                fieldName
            )
        }
    }

    internal companion object {
        internal fun getShadowNodeWrapper(
            reactContext: ReactContext,
            uiManagerModule: UIManagerModule,
            reflectionUtils: ReflectionUtils,
            viewId: Int
        ): ShadowNodeWrapper? {
            val countDownLatch = CountDownLatch(1)
            var target: ReactShadowNode<out ReactShadowNode<*>>? = null

            val shadowNodeRunnable = Runnable {
                val node = resolveShadowNode(reflectionUtils, uiManagerModule, viewId)
                if (node != null) {
                    target = node
                }

                countDownLatch.countDown()
            }

            reactContext.runOnNativeModulesQueueThread(shadowNodeRunnable)
            countDownLatch.await(5, TimeUnit.SECONDS)

            if (target == null) {
                return null
            }

            return ShadowNodeWrapper(reflectionUtils = reflectionUtils, shadowNode = target)
        }

        private fun resolveShadowNode(reflectionUtils: ReflectionUtils, uiManagerModule: UIManagerModule, tag: Int): ReactShadowNode<out ReactShadowNode<*>>? {
            val uiManagerImplementation = reflectionUtils.getDeclaredField(uiManagerModule, UI_IMPLEMENTATION_FIELD_NAME) as UIImplementation?
            return uiManagerImplementation?.resolveShadowNode(tag)
        }

        @VisibleForTesting
        internal const val UI_IMPLEMENTATION_FIELD_NAME = "mUIImplementation"
    }
}
