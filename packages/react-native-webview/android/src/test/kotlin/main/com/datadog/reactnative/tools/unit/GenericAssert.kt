/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package main.reactnative.tools.unit

import org.assertj.core.api.AbstractAssert

class GenericAssert(actual: Any?) :
    AbstractAssert<GenericAssert, Any>(actual, GenericAssert::class.java) {
    companion object {
        fun assertThat(actual: Any?): GenericAssert {
            return GenericAssert(actual)
        }
    }
}
