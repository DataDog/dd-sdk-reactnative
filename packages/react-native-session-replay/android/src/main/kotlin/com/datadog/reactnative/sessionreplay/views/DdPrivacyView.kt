/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.views

import android.content.Context
import com.datadog.reactnative.sessionreplay.R
import com.facebook.react.views.view.ReactViewGroup

/**
 * Native React Native UI element that inherits from ReactViewGroup and exposes extra properties.
 */
class DdPrivacyView(context: Context) : ReactViewGroup(context) {
    /**
     * Defines the way text and input should be masked.
     */
    var textAndInputPrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_text_and_input_privacy, value)
        }

    /**
     * Defines the way images should be masked.
     */
    var imagePrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_image_privacy, value)
        }

    /**
     * Defines the way user touches should be masked.
     */
    var touchPrivacy: String? = null
        set(value) {
            field = value
            this.setTag(R.id.datadog_touch_privacy, value)
        }

    /**
     * Defines the way certain parts of the UI can be set to hidden.
     */
    var hide: Boolean = false
        set(value) {
            field = value
            this.setTag(R.id.datadog_hidden, value)
        }

    init {
        this.setTag(R.id.datadog_hidden, this.hide)
        this.setTag(R.id.datadog_image_privacy, this.imagePrivacy)
        this.setTag(R.id.datadog_text_and_input_privacy, this.textAndInputPrivacy)
        this.setTag(R.id.datadog_touch_privacy, this.touchPrivacy)
    }
}