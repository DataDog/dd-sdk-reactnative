package com.datadog.reactnative.sessionreplay.views

import android.content.Context
import com.datadog.reactnative.sessionreplay.R
import com.facebook.react.views.view.ReactViewGroup

class DdView(context: Context) : ReactViewGroup(context) {
    var textAndInputPrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_text_and_input_privacy, value)
            println("*View-a ${this}, ${this.tag}, ${this.imagePrivacy}, ${this.textAndInputPrivacy} *")
        }

    var imagePrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_image_privacy, value)
            println("*View-b ${this}, ${this.tag}, ${this.imagePrivacy}, ${this.textAndInputPrivacy} *")
        }

    var touchPrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_touch_privacy, value)
            println("*View-c ${this}, ${this.tag}, ${this.imagePrivacy}, ${this.textAndInputPrivacy} *")
        }

    var hide: Boolean = false
        set(value) {
            field = value
            this.setTag(R.id.datadog_hidden, value)
        }

    init {
//        updateTags()
        this.setTag(R.id.datadog_hidden, this.hide)
        this.setTag(R.id.datadog_image_privacy, this.imagePrivacy)
        this.setTag(R.id.datadog_text_and_input_privacy, this.textAndInputPrivacy)
        this.setTag(R.id.datadog_touch_privacy, this.touchPrivacy)
    }

    private fun updateTags() {
        this.setTag(R.id.datadog_hidden, this.hide)
        this.setTag(R.id.datadog_image_privacy, this.imagePrivacy)
        this.setTag(R.id.datadog_text_and_input_privacy, this.textAndInputPrivacy)
        this.setTag(R.id.datadog_touch_privacy, this.touchPrivacy)
        println("*View ${this}, ${this.tag}, ${this.imagePrivacy}, ${this.textAndInputPrivacy} *")
    }

//    override fun dispatchDraw(canvas: android.graphics.Canvas) {
//        println("** Dispatach draw **")
//        super.dispatchDraw(canvas)
//        updateTags()
//    }
}