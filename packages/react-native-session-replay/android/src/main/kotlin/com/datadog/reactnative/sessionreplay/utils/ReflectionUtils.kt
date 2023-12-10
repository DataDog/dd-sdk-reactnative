/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay.utils

import java.lang.reflect.Field

internal class ReflectionUtils {
    internal fun getDeclaredField(instance: Any, fieldName: String): Any? {
        val classInstance = instance.javaClass
        val declaredField = searchForField(classInstance, fieldName)

        return declaredField?.let {
            it.isAccessible = true
            it.get(instance)
        }
    }

    private fun searchForField(className: Class<*>, fieldName: String): Field? {
        return className.declaredFields.firstOrNull { it.name == fieldName }
            ?: if (className.superclass != null) {
                searchForField(className.superclass, fieldName)
            } else {
                null
            }
    }
}
