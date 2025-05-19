/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.views

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.DdPrivacyViewManagerDelegate
import com.facebook.react.viewmanagers.DdPrivacyViewManagerInterface

class DdPrivacyViewManager(context: ReactApplicationContext) : ViewGroupManager<DdPrivacyView>(),
    DdPrivacyViewManagerInterface<DdPrivacyView> {
    companion object {
        const val REACT_CLASS = "DdPrivacyView"
    }

    private val delegate: DdPrivacyViewManagerDelegate<DdPrivacyView, DdPrivacyViewManager> = DdPrivacyViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<DdPrivacyView> = delegate

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): DdPrivacyView = DdPrivacyView(context)

    @ReactProp(name = "hide")
    override fun setHide(view: DdPrivacyView?, value: Boolean) {
        view?.let { view.hide = value }
    }

    @ReactProp(name = "textAndInputPrivacy")
    override fun setTextAndInputPrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.textAndInputPrivacy = value }
    }

    @ReactProp(name = "imagePrivacy")
    override fun setImagePrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.imagePrivacy = value }
    }

    @ReactProp(name = "touchPrivacy")
    override fun setTouchPrivacy(view: DdPrivacyView?, value: String?) {
        view?.let { view.touchPrivacy = value }
    }
}
