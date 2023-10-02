/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.InsetDrawable
import android.graphics.drawable.RippleDrawable
import android.os.Build
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.TextView
import com.datadog.android.sessionreplay.ExtensionSupport
import com.datadog.android.sessionreplay.SessionReplayPrivacy
import com.datadog.android.sessionreplay.internal.recorder.MappingContext
import com.datadog.android.sessionreplay.internal.recorder.OptionSelectorDetector
import com.datadog.android.sessionreplay.internal.recorder.TraversalStrategy
import com.datadog.android.sessionreplay.internal.recorder.mapper.BaseWireframeMapper
import com.datadog.android.sessionreplay.internal.recorder.mapper.WireframeMapper
import com.datadog.android.sessionreplay.model.MobileSegment
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.UIImplementation
import com.facebook.react.uimanager.UIManagerModule
import com.facebook.react.views.text.ReactTextShadowNode
import com.facebook.react.views.text.ReactTextView
import com.facebook.react.views.text.TextAttributes
import com.facebook.react.views.view.ReactViewBackgroundDrawable
import com.facebook.react.views.view.ReactViewGroup
import okhttp3.internal.notify
import okhttp3.internal.wait

class ReactNativeSessionReplayExtensionSupport(private val reactContext: ReactContext) : ExtensionSupport {

    override fun getCustomViewMappers(): Map<SessionReplayPrivacy, Map<Class<*>, WireframeMapper<View, *>>> {
        return mapOf(SessionReplayPrivacy.ALLOW to mapOf(
            ReactTextView::class.java to ReactTextViewMapper(reactContext) as WireframeMapper<View, *>,
            ReactViewGroup::class.java to ReactViewGroupMapper() as WireframeMapper<View, *>
        ))
    }

    override fun getOptionSelectorDetectors(): List<OptionSelectorDetector> {
        return listOf()
    }
}

private inline fun UIManagerModule.resolveShadowNode(tag: Int): ReactShadowNode<out ReactShadowNode<*>>? {
    return javaClass.getDeclaredField("mUIImplementation").let {
        it.isAccessible = true
        val value = it.get(this) as UIImplementation
        return@let value.resolveShadowNode(tag);
    }
}

private inline fun ReactTextShadowNode.getColor(): Int {
    return javaClass.superclass.getDeclaredField("mColor").let {
        it.isAccessible = true
        return@let it.getInt(this);
    }
}

private inline fun ReactTextShadowNode.getBackgroundColor(): Int {
    return javaClass.superclass.getDeclaredField("mBackgroundColor").let {
        it.isAccessible = true
        return@let it.getInt(this);
    }
}

private inline fun ReactTextShadowNode.getFontSize(): Int {
    return javaClass.superclass.getDeclaredField("mTextAttributes").let {
        it.isAccessible = true
        val textAttributes = it.get(this) as TextAttributes
        return@let textAttributes.effectiveFontSize;
    }
}



class ReactTextViewMapper(private val reactContext: ReactContext) :
    BaseWireframeMapper<ReactTextView, MobileSegment.Wireframe.TextWireframe>() {

    private var shadowNode: ReactTextShadowNode? = null

    private fun setShadowNode(shadowNode: ReactTextShadowNode) {
        this.shadowNode = shadowNode
    }

    override fun map(view: ReactTextView, mappingContext: MappingContext):
            List<MobileSegment.Wireframe.TextWireframe> {

        val uiManager = reactContext.getNativeModule(
            UIManagerModule::class.java) as UIManager

        val getShadowNode = Runnable {
            val node = (uiManager as UIManagerModule).resolveShadowNode(view.id)
            if (node != null) {
                this.setShadowNode(node as ReactTextShadowNode)
            }
            synchronized(this) {
                this.notify()
            }
        }
        synchronized(this) {
            // maybe this line can be moved up
            reactContext.runOnNativeModulesQueueThread(getShadowNode)
            this.wait()
        }

        val viewGlobalBounds = resolveViewGlobalBounds(
            view,
            mappingContext.systemInformation.screenDensity
        )
        view.background?.let { Log.d("RNRNRN", it.toString()) }

        val (shapeStyle, border) = MobileSegment.ShapeStyle(colorAndAlphaAsStringHexa(shadowNode?.getBackgroundColor() ?: 0, 255), 255) to null

        return listOf(
            MobileSegment.Wireframe.TextWireframe(
                id = resolveViewId(view),
                x = viewGlobalBounds.x,
                y = viewGlobalBounds.y,
                width = viewGlobalBounds.width,
                height = viewGlobalBounds.height,
                shapeStyle = shapeStyle,
                border = border,
                text = view.text.toString(),
                textStyle = resolveTextStyle(view, mappingContext.systemInformation.screenDensity),
                textPosition = resolveTextPosition(
                    view,
                    mappingContext.systemInformation.screenDensity
                )
            )
        )
    }

    // region Internal

    private fun resolveTextStyle(textView: ReactTextView, pixelsDensity: Float):
            MobileSegment.TextStyle {

        return MobileSegment.TextStyle(
            resolveFontFamily(textView.typeface),
            resolveFontSize(textView).densityNormalized(pixelsDensity),
            resolveTextColor(textView)
        )
    }

    private fun resolveFontSize(textView: ReactTextView): Long  {
        this.shadowNode?.let {
            return it.getFontSize().toLong()
        }

        return textView.textSize.toLong()
    }

    private fun resolveTextColor(textView: ReactTextView): String {
        this.shadowNode?.let {
            return colorAndAlphaAsStringHexa(it.getColor(), OPAQUE_ALPHA_VALUE)
        }
        return if (textView.text.isNullOrEmpty()) {
            resolveHintTextColor(textView)
        } else {
            colorAndAlphaAsStringHexa(textView.currentTextColor, OPAQUE_ALPHA_VALUE)
        }
    }

    private fun resolveHintTextColor(textView: ReactTextView): String {
        val hintTextColors = textView.hintTextColors
        return if (hintTextColors != null) {
            colorAndAlphaAsStringHexa(hintTextColors.defaultColor, OPAQUE_ALPHA_VALUE)
        } else {
            colorAndAlphaAsStringHexa(textView.currentTextColor, OPAQUE_ALPHA_VALUE)
        }
    }

    private fun resolveFontFamily(typeface: Typeface?): String {
        return when {
            typeface === Typeface.SANS_SERIF -> SANS_SERIF_FAMILY_NAME
            typeface === Typeface.MONOSPACE -> MONOSPACE_FAMILY_NAME
            typeface === Typeface.SERIF -> SERIF_FAMILY_NAME
            else -> SANS_SERIF_FAMILY_NAME
        }
    }

    private fun resolveTextPosition(textView: ReactTextView, pixelsDensity: Float):
            MobileSegment.TextPosition {
        return MobileSegment.TextPosition(
            resolvePadding(textView, pixelsDensity),
            resolveAlignment(textView)
        )
    }

    private fun resolvePadding(textView: ReactTextView, pixelsDensity: Float): MobileSegment.Padding {
        return MobileSegment.Padding(
            top = textView.totalPaddingTop.densityNormalized(pixelsDensity).toLong(),
            bottom = textView.totalPaddingBottom.densityNormalized(pixelsDensity).toLong(),
            left = textView.totalPaddingStart.densityNormalized(pixelsDensity).toLong(),
            right = textView.totalPaddingEnd.densityNormalized(pixelsDensity).toLong()
        )
    }

    private fun resolveAlignment(textView: ReactTextView): MobileSegment.Alignment {
        return when (textView.textAlignment) {
            TextView.TEXT_ALIGNMENT_CENTER -> MobileSegment.Alignment(
                horizontal = MobileSegment.Horizontal.CENTER,
                vertical = MobileSegment.Vertical.CENTER
            )
            TextView.TEXT_ALIGNMENT_TEXT_END,
            TextView.TEXT_ALIGNMENT_VIEW_END -> MobileSegment.Alignment(
                horizontal = MobileSegment.Horizontal.RIGHT,
                vertical = MobileSegment.Vertical.CENTER
            )
            TextView.TEXT_ALIGNMENT_TEXT_START,
            TextView.TEXT_ALIGNMENT_VIEW_START -> MobileSegment.Alignment(
                horizontal = MobileSegment.Horizontal.LEFT,
                vertical = MobileSegment.Vertical.CENTER
            )
            TextView.TEXT_ALIGNMENT_GRAVITY -> resolveAlignmentFromGravity(textView)
            else -> MobileSegment.Alignment(
                horizontal = MobileSegment.Horizontal.LEFT,
                vertical = MobileSegment.Vertical.CENTER
            )
        }
    }

    private fun resolveAlignmentFromGravity(textView: ReactTextView): MobileSegment.Alignment {
        val horizontalAlignment = when (textView.gravity.and(Gravity.HORIZONTAL_GRAVITY_MASK)) {
            Gravity.START,
            Gravity.LEFT -> MobileSegment.Horizontal.LEFT
            Gravity.END,
            Gravity.RIGHT -> MobileSegment.Horizontal.RIGHT
            Gravity.CENTER -> MobileSegment.Horizontal.CENTER
            Gravity.CENTER_HORIZONTAL -> MobileSegment.Horizontal.CENTER
            else -> MobileSegment.Horizontal.LEFT
        }
        val verticalAlignment = when (textView.gravity.and(Gravity.VERTICAL_GRAVITY_MASK)) {
            Gravity.TOP -> MobileSegment.Vertical.TOP
            Gravity.BOTTOM -> MobileSegment.Vertical.BOTTOM
            Gravity.CENTER_VERTICAL -> MobileSegment.Vertical.CENTER
            Gravity.CENTER -> MobileSegment.Vertical.CENTER
            else -> MobileSegment.Vertical.CENTER
        }

        return MobileSegment.Alignment(horizontalAlignment, verticalAlignment)
    }

    // endregion

    internal companion object {
        internal const val OPAQUE_ALPHA_VALUE = 255
        internal const val STATIC_MASK = "***"
        internal const val SANS_SERIF_FAMILY_NAME = "roboto, sans-serif"
        internal const val SERIF_FAMILY_NAME = "serif"
        internal const val MONOSPACE_FAMILY_NAME = "monospace"
    }
}

internal fun Long.densityNormalized(density: Float): Long {
    if (density == 0f) {
        return this
    }
    return (this / density).toLong()
}
internal fun Int.densityNormalized(density: Float): Int {
    if (density == 0f) {
        return this
    }
    return (this / density).toInt()
}

private inline fun ReactViewGroup.getRNBackgroundColor(): Int {
    try {
        return javaClass.getDeclaredField("mReactBackgroundDrawable").let {
            it.isAccessible = true
            val backgroundDrawable = it.get(this) as ReactViewBackgroundDrawable? ?: return@let 0
            return@let backgroundDrawable.color;
        } as Int
    } catch (e: Exception) {
        return 0
    }
}

private inline fun ReactViewGroup.getBackgroundAlpha(): Int {
    try {
        return javaClass.getDeclaredField("mReactBackgroundDrawable").let {
            it.isAccessible = true
            val backgroundDrawable = it.get(this) as ReactViewBackgroundDrawable?
            if (backgroundDrawable == null) {
                return@let 255
            }
            return@let backgroundDrawable.alpha;
        } as Int
    } catch (e: Exception) {
        return 255
    }
}

class ReactViewGroupMapper() :
    BaseWireframeMapper<ReactViewGroup, MobileSegment.Wireframe.ShapeWireframe>() {

    override val traversalStrategy: TraversalStrategy
        get() = TraversalStrategy.TRAVERSE_ALL_CHILDREN

    private fun resolveRNShapeStyleAndBorder(viewAlpha: Int, viewColor: Int):
        Pair<MobileSegment.ShapeStyle?, MobileSegment.ShapeBorder?> {
        val color = colorAndAlphaAsStringHexa(viewColor, 255)

        return MobileSegment.ShapeStyle(color, viewAlpha) to null
    }

    private var shadowNode: ReactTextShadowNode? = null

    private fun setShadowNode(shadowNode: ReactTextShadowNode) {
        this.shadowNode = shadowNode
    }

    override fun map(view: ReactViewGroup, mappingContext: MappingContext):
            List<MobileSegment.Wireframe.ShapeWireframe> {

        val viewGlobalBounds = resolveViewGlobalBounds(
            view,
            mappingContext.systemInformation.screenDensity
        )

        val (shapeStyle, border) = resolveRNShapeStyleAndBorder(
            view.getBackgroundAlpha(),
            view.getRNBackgroundColor()
        )
        return listOf(
            MobileSegment.Wireframe.ShapeWireframe(
                resolveViewId(view),
                viewGlobalBounds.x,
                viewGlobalBounds.y,
                viewGlobalBounds.width,
                viewGlobalBounds.height,
                shapeStyle = shapeStyle,
                border = border
            )
        )

    }
}
