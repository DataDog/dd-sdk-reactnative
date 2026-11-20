/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.text.Layout
import android.view.View
import com.datadog.android.api.InternalLogger
import java.lang.reflect.Method

/** A snapshot of React Native's prepared text layout, read on the UI thread. */
internal data class PreparedTextLayout(
    val layout: Layout,
    val text: CharSequence,
    val verticalOffset: Float
)

/** Reads the optional RN text implementation without linking older RN apps to its classes. */
internal class PreparedTextLayoutReader {
    private var accessors: Accessors? = null
    private var resolved: Boolean = false
    private var failureLogged: Boolean = false

    /** Returns null while a layout is unavailable, or if its API cannot be read safely. */
    fun read(view: View, logger: InternalLogger): PreparedTextLayout? {
        return try {
            if (!resolved) {
                resolved = true
                accessors = resolveAccessors(view.javaClass)
            }
            val methods = accessors ?: return null
            val prepared = methods.preparedLayout.invoke(view) ?: return null
            val layout = methods.layout.invoke(prepared) as? Layout ?: return null
            val text = methods.text.invoke(view) as? CharSequence ?: return null
            val offset = (methods.verticalOffset.invoke(prepared) as? Number)?.toFloat() ?: 0f
            PreparedTextLayout(layout, text, offset)
        } catch (error: ReflectiveOperationException) {
            logFailure(logger, error)
            null
        } catch (error: SecurityException) {
            logFailure(logger, error)
            null
        }
    }

    private fun resolveAccessors(viewClass: Class<*>): Accessors {
        val preparedLayout = viewClass.getMethod("getPreparedLayout")
        val preparedClass = preparedLayout.returnType
        return Accessors(
            preparedLayout,
            viewClass.getMethod("getText"),
            preparedClass.getMethod("getLayout"),
            preparedClass.getMethod("getVerticalOffset")
        )
    }

    private fun logFailure(logger: InternalLogger, error: Exception) {
        if (!failureLogged) {
            failureLogged = true
            logger.log(
                level = InternalLogger.Level.WARN,
                targets = listOf(InternalLogger.Target.MAINTAINER, InternalLogger.Target.TELEMETRY),
                messageBuilder = { "Unable to read React Native prepared text layout" },
                throwable = error
            )
        }
    }

    private data class Accessors(
        val preparedLayout: Method,
        val text: Method,
        val layout: Method,
        val verticalOffset: Method
    )
}
