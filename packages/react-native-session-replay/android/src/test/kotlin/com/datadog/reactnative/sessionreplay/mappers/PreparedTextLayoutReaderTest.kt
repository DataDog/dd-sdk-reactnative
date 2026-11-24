/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.mappers

import android.content.Context
import android.text.Layout
import android.view.View
import android.view.ViewGroup
import com.datadog.android.api.InternalLogger
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever

internal class PreparedTextLayoutReaderTest {
    private val logger: InternalLogger = mock()

    @Test
    fun `M read actual React Native prepared text accessors W read() { RN 0_89 and above }`() {
        assumeTrue((ReactNativeVersion.VERSION["minor"] as Int) >= 89)
        val viewClass = Class.forName("com.facebook.react.views.text.PreparedLayoutTextView")
            .asSubclass(ViewGroup::class.java)
        assertThat(PreparedLayoutTextViewMapper.resolveViewClass()).isEqualTo(viewClass)
        val view = viewClass.getConstructor(Context::class.java).newInstance(mock<Context>())
        val reader = PreparedTextLayoutReader()
        assertThat(reader.read(view, logger)).isNull()

        val layout: Layout = mock()
        whenever(layout.text).thenReturn("displayed text")
        val sourceText = "full source text"
        val preparedClass = viewClass.getMethod("getPreparedLayout").returnType
        val attributesClass = Class.forName("com.facebook.react.views.text.TextAttributeProps")
        val prepared = preparedClass.constructors.single().newInstance(
            layout,
            1,
            4f,
            intArrayOf(),
            0,
            0,
            Mockito.mock(attributesClass),
            sourceText
        )
        viewClass.getMethod("setPreparedLayout", preparedClass).invoke(view, prepared)
        view.layout(0, 0, 200, 100)

        val result = reader.read(view, logger)

        assertThat(result).isEqualTo(PreparedTextLayout(layout, sourceText, 4f))
        assertThat(result?.layout?.text?.toString()).isEqualTo("displayed text")
    }

    @Test
    fun `M read prepared layout through public accessors W read()`() {
        val layout: Layout = mock()
        val view: FakePreparedTextView = mock()
        whenever(view.preparedLayout).thenReturn(FakePreparedLayout(layout, 4f))
        whenever(view.text).thenReturn("full text")

        val result = PreparedTextLayoutReader().read(view, logger)

        assertThat(result).isEqualTo(PreparedTextLayout(layout, "full text", 4f))
    }

    @Test
    fun `M return null W read() { view is not laid out }`() {
        val view: FakePreparedTextView = mock()

        assertThat(PreparedTextLayoutReader().read(view, logger)).isNull()
    }

    @Test
    fun `M contain unsupported view reflection failures W read()`() {
        val view: View = mock()
        val reader = PreparedTextLayoutReader()

        assertThat(reader.read(view, logger)).isNull()
        assertThat(reader.read(view, logger)).isNull()
    }

    open class FakePreparedTextView(context: Context) : View(context) {
        open val preparedLayout: FakePreparedLayout? = null
        open val text: CharSequence? = null
    }

    class FakePreparedLayout(val layout: Layout, val verticalOffset: Float)
}
