/*
 *  Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative.sessionreplay.views

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class DdPrivacyViewManager(context: ReactApplicationContext) : ViewGroupManager<DdPrivacyView>() {
    companion object {
        const val REACT_CLASS = "DdPrivacyView"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): DdPrivacyView {
        return DdPrivacyView(context)
    }

    @ReactProp(name = "hide")
    fun setHide(view: DdPrivacyView?, value: Boolean) {
        view?.let { view.hide = value }
    }

    @ReactProp(name = "textAndInputPrivacy")
    fun setTextAndInputPrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.textAndInputPrivacy = value }
    }

    @ReactProp(name = "imagePrivacy")
    fun setImagePrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.imagePrivacy = value }
    }

    @ReactProp(name = "touchPrivacy")
    fun setTouchPrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.touchPrivacy = value }
    }

    @ReactProp(name = "nativeID")
    fun setNativeID(view: DdPrivacyView?, value: String?) {
        view?.nativeID = value
    }

    @ReactProp(name = "attributes")
    fun setAttributes(view: DdPrivacyView?, map: ReadableMap?) {
        view?.attributes = map?.toHashMap()?.mapValues {
            it.value.toString() ?: ""
        }
    }
}
