package com.datadog.reactnative.sessionreplay.views

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.DdViewManagerDelegate
import com.facebook.react.viewmanagers.DdViewManagerInterface

class DdViewManager(context: ReactApplicationContext): ViewGroupManager<DdView>(), DdViewManagerInterface<DdView> {
    companion object {
        const val REACT_CLASS = "DdView"
    }

    private val delegate: DdViewManagerDelegate<DdView, DdViewManager> = DdViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<DdView> = delegate

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(context: ThemedReactContext): DdView = DdView(context)

    @ReactProp(name = "hide")
    override fun setHide(view: DdView?, value: Boolean) {
        view?.let { view.hide = value }
    }

    @ReactProp(name = "textAndInputPrivacy")
    override fun setTextAndInputPrivacy(view: DdView?, value: String?) {
        view?.let { view.textAndInputPrivacy = value }
    }

    @ReactProp(name = "imagePrivacy")
    override fun setImagePrivacy(view: DdView?, value: String?) {
        view?.let { view.imagePrivacy = value }
    }

    @ReactProp(name = "touchPrivacy")
    override fun setTouchPrivacy(view: DdView?, value: String?) {
        view?.let { view.touchPrivacy = value }
    }
}