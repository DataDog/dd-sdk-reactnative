/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.datadog.reactnative.sessionreplay.extensions

import com.facebook.react.uimanager.LengthPercentage

internal fun LengthPercentage?.getRadius(width: Float, height: Float) = this
    ?.resolve(width, height)
    ?: 0f
