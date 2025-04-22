package com.datadog.reactnative.sessionreplay.views

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

class DdViewManager(context: ReactApplicationContext): ViewGroupManager<DdView>() {
    companion object {
        const val REACT_CLASS = "DdView"
    }

    override fun getName(): String = REACT_CLASS

//    override fun createViewInstance(context: ThemedReactContext): DdView = DdView(context)

    init {
        Log.d("DdViewManager", "Old architecture DdViewManager loaded")
    }

    override fun createViewInstance(context: ThemedReactContext): DdView {
        Log.d("DdViewManager", "Creating DdView instance (old arch)")
        return DdView(context)
    }

    @ReactProp(name = "hide")
    fun setHide(view: DdView?, value: Boolean) {
        view?.let { view.hide = value }
    }

    @ReactProp(name = "textAndInputPrivacy")
    fun setTextAndInputPrivacy(view: DdView?, value: String?) {
        view?.let { view.textAndInputPrivacy = value }
    }

    @ReactProp(name = "imagePrivacy")
    fun setImagePrivacy(view: DdView?, value: String?) {
        view?.let { view.imagePrivacy = value }
    }

    @ReactProp(name = "touchPrivacy")
    fun setTouchPrivacy(view: DdView?, value: String?) {
        view?.let { view.touchPrivacy = value }
    }
}